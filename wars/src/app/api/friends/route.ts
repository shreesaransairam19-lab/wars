import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({ targetUserId: z.string().uuid() });
const actionSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(["accept", "reject", "cancel", "unfriend"]),
});

function migrationError() {
  return NextResponse.json({ error: "Friends need the latest WARS social-features database migration." }, { status: 503 });
}

function isMissingTable(error: { code?: string } | null) {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

async function signedInUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function GET(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to view friends." }, { status: 401 });

  const admin = createAdminClient();
  const targetUserId = new URL(request.url).searchParams.get("user_id");
  if (targetUserId) {
    if (!z.string().uuid().safeParse(targetUserId).success || targetUserId === user.id) {
      return NextResponse.json({ relationship: "none" });
    }
    const { data, error } = await admin.from("friend_requests").select("id,requester_id,addressee_id,status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
      .in("status", ["pending", "accepted"]).limit(1).maybeSingle();
    if (isMissingTable(error)) return migrationError();
    if (error) return NextResponse.json({ error: "Could not load friend status." }, { status: 500 });
    if (!data) return NextResponse.json({ relationship: "none" });
    if (data.status === "accepted") return NextResponse.json({ relationship: "friends", requestId: data.id });
    return NextResponse.json({
      relationship: data.requester_id === user.id ? "outgoing" : "incoming",
      requestId: data.id,
    });
  }

  const [incomingResult, outgoingResult, acceptedResult] = await Promise.all([
    admin.from("friend_requests").select("id,requester_id,addressee_id,status,created_at").eq("addressee_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
    admin.from("friend_requests").select("id,requester_id,addressee_id,status,created_at").eq("requester_id", user.id).eq("status", "pending").order("created_at", { ascending: false }),
    admin.from("friend_requests").select("id,requester_id,addressee_id,status,created_at").or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).eq("status", "accepted").order("created_at", { ascending: false }),
  ]);
  const firstError = incomingResult.error ?? outgoingResult.error ?? acceptedResult.error;
  if (isMissingTable(firstError)) return migrationError();
  if (firstError) return NextResponse.json({ error: "Could not load your friend list." }, { status: 500 });

  const rows = [...(incomingResult.data ?? []), ...(outgoingResult.data ?? []), ...(acceptedResult.data ?? [])];
  const profileIds = [...new Set(rows.flatMap((row) => [row.requester_id, row.addressee_id]).filter((id) => id !== user.id))];
  const { data: profiles, error: profileError } = profileIds.length
    ? await admin.from("profiles").select("id,username,display_name,avatar_path").in("id", profileIds)
    : { data: [], error: null };
  if (profileError) return NextResponse.json({ error: "Could not load friend profiles." }, { status: 500 });
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const withMember = (row: NonNullable<typeof incomingResult.data>[number]) => ({
    ...row,
    member: profileById.get(row.requester_id === user.id ? row.addressee_id : row.requester_id) ?? null,
  });

  return NextResponse.json({
    incoming: (incomingResult.data ?? []).map(withMember),
    outgoing: (outgoingResult.data ?? []).map(withMember),
    friends: (acceptedResult.data ?? []).map(withMember),
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to add friends." }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid WARS member." }, { status: 400 });
  const targetUserId = parsed.data.targetUserId;
  if (targetUserId === user.id) return NextResponse.json({ error: "You cannot add yourself as a friend." }, { status: 400 });

  const admin = createAdminClient();
  const { data: target, error: targetError } = await admin.from("profiles").select("id").eq("id", targetUserId).maybeSingle();
  if (targetError) return NextResponse.json({ error: "Could not find this WARS member." }, { status: 500 });
  if (!target) return NextResponse.json({ error: "WARS member not found." }, { status: 404 });

  const { data: existing, error: existingError } = await admin.from("friend_requests")
    .select("id,requester_id,addressee_id,status")
    .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
    .in("status", ["pending", "accepted"]).limit(1).maybeSingle();
  if (isMissingTable(existingError)) return migrationError();
  if (existingError) return NextResponse.json({ error: "Could not check friend status." }, { status: 500 });
  if (existing?.status === "accepted") return NextResponse.json({ relationship: "friends", requestId: existing.id });
  if (existing?.status === "pending" && existing.requester_id === user.id) {
    return NextResponse.json({ relationship: "outgoing", requestId: existing.id });
  }
  if (existing?.status === "pending" && existing.addressee_id === user.id) {
    const { error } = await admin.from("friend_requests").update({ status: "accepted", updated_at: new Date().toISOString(), responded_at: new Date().toISOString() }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: "Could not accept the incoming friend request." }, { status: 500 });
    return NextResponse.json({ relationship: "friends", requestId: existing.id, mutualRequestAccepted: true });
  }

  const { data: oldRequest, error: oldError } = await admin.from("friend_requests").select("id,status").eq("requester_id", user.id).eq("addressee_id", targetUserId).maybeSingle();
  if (isMissingTable(oldError)) return migrationError();
  if (oldError) return NextResponse.json({ error: "Could not create friend request." }, { status: 500 });
  const result = oldRequest
    ? await admin.from("friend_requests").update({ status: "pending", updated_at: new Date().toISOString(), responded_at: null }).eq("id", oldRequest.id).select("id").single()
    : await admin.from("friend_requests").insert({ requester_id: user.id, addressee_id: targetUserId }).select("id").single();
  if (result.error) {
    if (result.error.code === "23505") return NextResponse.json({ error: "A friend request is already pending." }, { status: 409 });
    return NextResponse.json({ error: "Could not send friend request." }, { status: 500 });
  }
  return NextResponse.json({ relationship: "outgoing", requestId: result.data.id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await signedInUser();
  if (!user) return NextResponse.json({ error: "Sign in to manage friend requests." }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid request action." }, { status: 400 });
  const { requestId, action } = parsed.data;
  const admin = createAdminClient();

  if (action === "unfriend") {
    const { data, error } = await admin.from("friend_requests").delete().eq("id", requestId).eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`).select("id").maybeSingle();
    if (isMissingTable(error)) return migrationError();
    if (error) return NextResponse.json({ error: "Could not remove this friend." }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Friendship not found." }, { status: 404 });
    return NextResponse.json({ relationship: "none" });
  }

  const isRecipientAction = action === "accept" || action === "reject";
  const nextStatus = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "cancelled";
  const query = admin.from("friend_requests").update({ status: nextStatus, updated_at: new Date().toISOString(), responded_at: action === "cancel" ? null : new Date().toISOString() })
    .eq("id", requestId).eq("status", "pending");
  const { data, error } = isRecipientAction
    ? await query.eq("addressee_id", user.id).select("id").maybeSingle()
    : await query.eq("requester_id", user.id).select("id").maybeSingle();
  if (isMissingTable(error)) return migrationError();
  if (error) return NextResponse.json({ error: "Could not update this friend request." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "This request is no longer pending." }, { status: 409 });
  return NextResponse.json({ relationship: action === "accept" ? "friends" : "none" });
}
