import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileFrame } from "@/lib/profile-frames/catalog";
import { getUserRoles, hasAnyRole } from "@/lib/permissions/guards";
import { getLevelProgress, XP_REWARDS } from "@/lib/xp/calculate";

const UPI_ID = "fictrivosoftwarelimited@oksbi";
const XP_PAGE_SIZE = 1000;

async function getCurrentLevel(admin: ReturnType<typeof createAdminClient>, userId: string, isOwner: boolean) {
  if (isOwner) return 100;

  const rows: { amount: number; reason: string }[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await admin
      .from("xp_ledger")
      .select("amount,reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + XP_PAGE_SIZE - 1);
    if (error) {
      console.error("Could not read XP for profile frame eligibility", { code: error.code, message: error.message });
      return null;
    }
    const page = data ?? [];
    rows.push(...page);
    if (page.length < XP_PAGE_SIZE) break;
    offset += page.length;
  }

  const { count: completedChapters, error: progressError } = await admin
    .from("reading_progress")
    .select("chapter_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("completed", true);
  if (progressError) {
    console.error("Could not read chapter progress for profile frame eligibility", { code: progressError.code, message: progressError.message });
    return null;
  }

  const otherXp = rows.filter((row) => row.reason !== "read_chapter").reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const recordedReadXp = rows.filter((row) => row.reason === "read_chapter").reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const earnedXp = otherXp + Math.max(recordedReadXp, (completedChapters ?? 0) * XP_REWARDS.read_chapter);
  return getLevelProgress(Math.max(0, earnedXp)).currentLevel;
}

async function getSignedInUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET() {
  const user = await getSignedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to use the frame store" }, { status: 401 });

  const roles = await getUserRoles(user.id);
  const admin = createAdminClient();
  const [inventory, equipped, orders, level] = await Promise.all([
    admin.from("user_profile_frames").select("frame_id,purchased_at").eq("user_id", user.id),
    admin.from("profile_frame_equipped").select("frame_id").eq("user_id", user.id).maybeSingle(),
    admin.from("profile_frame_orders").select("id,frame_id,price_inr,status,payment_reference,xp_awarded,created_at,submitted_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    getCurrentLevel(admin, user.id, roles.includes("owner")),
  ]);
  const failed = inventory.error || equipped.error || orders.error;
  if (failed) {
    console.error("Could not load profile frame store", failed);
    return NextResponse.json({ error: "The frame store database migration may not be applied yet." }, { status: 503 });
  }
  if (level === null) return NextResponse.json({ error: "Could not check your level reward eligibility" }, { status: 503 });

  return NextResponse.json({
    ownedFrameIds: (inventory.data ?? []).map((item) => item.frame_id),
    equippedFrameId: equipped.data?.frame_id ?? null,
    orders: orders.data ?? [],
    level,
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const user = await getSignedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to use the frame store" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const frameId = body && typeof body === "object" ? (body as { frameId?: unknown }).frameId : null;
  if (typeof frameId !== "string") return NextResponse.json({ error: "Choose a valid frame" }, { status: 400 });
  const frame = getProfileFrame(frameId);
  if (!frame) return NextResponse.json({ error: "That frame is not available in the store" }, { status: 400 });

  const roles = await getUserRoles(user.id);
  const isOwner = roles.includes("owner");
  const isFounder = await hasAnyRole(user.id, ["owner"]);
  const admin = createAdminClient();
  const level = frame.unlockLevel ? await getCurrentLevel(admin, user.id, isOwner) : null;
  if (frame.unlockLevel && level === null) return NextResponse.json({ error: "Could not verify your level reward eligibility" }, { status: 503 });
  if (frame.unlockLevel && level !== null && level < frame.unlockLevel) {
    return NextResponse.json({ error: `Reach Level ${frame.unlockLevel} to unlock this frame` }, { status: 403 });
  }
  const [{ data: owned, error: ownedError }, { data: active, error: activeError }] = await Promise.all([
    admin.from("user_profile_frames").select("frame_id").eq("user_id", user.id).eq("frame_id", frame.id).maybeSingle(),
    admin.from("profile_frame_orders").select("id,status").eq("user_id", user.id).eq("frame_id", frame.id).in("status", ["awaiting_payment", "submitted", "approved"]).maybeSingle(),
  ]);
  if (ownedError || activeError) return NextResponse.json({ error: "Could not check your frame store account" }, { status: 500 });
  if (owned) return NextResponse.json({ error: "You already own this frame" }, { status: 409 });

  const canClaimFree = frame.unlockLevel ? Boolean(level && level >= frame.unlockLevel) : isFounder;
  if (canClaimFree) {
    if (active && active.status !== "awaiting_payment") {
      return NextResponse.json({ error: "A payment for this frame is already under review. Ask an Admin to resolve that order before claiming the free Owner frame." }, { status: 409 });
    }
    if (active) {
      const { data: cancelledOrder, error: cancelError } = await admin.from("profile_frame_orders")
        .update({ status: "cancelled" })
        .eq("id", active.id).eq("user_id", user.id).eq("status", "awaiting_payment")
        .select("id").maybeSingle();
      if (cancelError) return NextResponse.json({ error: "Could not close the unpaid order. Refresh and try again." }, { status: 500 });
      if (!cancelledOrder) return NextResponse.json({ error: "Your order changed. Refresh the store and try again." }, { status: 409 });
    }

    const { error: ownershipError } = await admin.from("user_profile_frames").insert({ user_id: user.id, frame_id: frame.id });
    if (ownershipError && ownershipError.code !== "23505") {
      console.error("Could not grant free profile frame", ownershipError);
      return NextResponse.json({ error: "Could not claim this free profile frame" }, { status: 500 });
    }
    const { error: equipError } = await admin.from("profile_frame_equipped")
      .upsert({ user_id: user.id, frame_id: frame.id, equipped_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (equipError) {
      console.error("Could not equip free Owner profile frame", equipError);
    }
    return NextResponse.json({ success: true, freeClaim: true, levelReward: Boolean(frame.unlockLevel), equipped: !equipError, frameId: frame.id }, { status: 200, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }

  if (active) return NextResponse.json({ error: "You already have an order for this frame", orderId: active.id, status: active.status }, { status: 409 });

  const { data: order, error } = await admin.from("profile_frame_orders").insert({
    user_id: user.id,
    frame_id: frame.id,
    price_inr: frame.priceInr,
    status: "awaiting_payment",
  }).select("id,frame_id,price_inr,status,created_at").single();
  if (error || !order) {
    if (error?.code === "23505") {
      const { data: existing } = await admin.from("profile_frame_orders")
        .select("id,status")
        .eq("user_id", user.id)
        .eq("frame_id", frame.id)
        .in("status", ["awaiting_payment", "submitted", "approved"])
        .maybeSingle();
      if (existing) return NextResponse.json({ error: "You already have an order for this frame", orderId: existing.id, status: existing.status }, { status: 409 });
    }
    console.error("Could not create profile frame order", error);
    return NextResponse.json({ error: "Could not start this purchase" }, { status: 500 });
  }

  const upiLink = `upi://pay?${new URLSearchParams({ pa: UPI_ID, am: frame.priceInr.toFixed(2), cu: "INR", tn: `WARS frame ${order.id.slice(0, 8)}` }).toString()}`;
  return NextResponse.json({ order, upiId: UPI_ID, upiLink }, { status: 201, headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const user = await getSignedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to use the frame store" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { action, orderId, paymentReference, frameId } = body as {
    action?: unknown; orderId?: unknown; paymentReference?: unknown; frameId?: unknown;
  };
  const admin = createAdminClient();

  if (action === "equip") {
    if (typeof frameId !== "string" || !getProfileFrame(frameId)) return NextResponse.json({ error: "Choose a valid frame" }, { status: 400 });
    const { data: owned, error: ownedError } = await admin.from("user_profile_frames").select("frame_id").eq("user_id", user.id).eq("frame_id", frameId).maybeSingle();
    if (ownedError) return NextResponse.json({ error: "Could not check frame ownership" }, { status: 500 });
    if (!owned) return NextResponse.json({ error: "Buy and verify this frame before equipping it" }, { status: 403 });
    const { error } = await admin.from("profile_frame_equipped").upsert({ user_id: user.id, frame_id: frameId, equipped_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: "Could not equip this frame" }, { status: 500 });
    return NextResponse.json({ success: true, equippedFrameId: frameId });
  }

  if (action === "unequip") {
    const { error } = await admin.from("profile_frame_equipped").delete().eq("user_id", user.id);
    if (error) return NextResponse.json({ error: "Could not restore your role frame" }, { status: 500 });
    return NextResponse.json({ success: true, equippedFrameId: null });
  }

  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ error: "Choose a valid order" }, { status: 400 });
  if (action === "cancel") {
    const { data, error } = await admin.from("profile_frame_orders").update({ status: "cancelled" }).eq("id", orderId).eq("user_id", user.id).eq("status", "awaiting_payment").select("id").maybeSingle();
    if (error) return NextResponse.json({ error: "Could not cancel this order" }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Only unpaid orders can be cancelled" }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (action !== "submit-payment") return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  if (typeof paymentReference !== "string") return NextResponse.json({ error: "Enter the UPI transaction reference" }, { status: 400 });
  const reference = paymentReference.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,64}$/.test(reference)) return NextResponse.json({ error: "Enter a 6–64 character UTR or transaction reference" }, { status: 400 });

  const { data, error } = await admin.from("profile_frame_orders").update({ status: "submitted", payment_reference: reference, submitted_at: new Date().toISOString() }).eq("id", orderId).eq("user_id", user.id).eq("status", "awaiting_payment").select("id").maybeSingle();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "That transaction reference was already submitted" }, { status: 409 });
    console.error("Could not submit frame payment reference", error);
    return NextResponse.json({ error: "Could not submit this payment for review" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "This order is no longer waiting for payment" }, { status: 409 });
  return NextResponse.json({ success: true });
}
