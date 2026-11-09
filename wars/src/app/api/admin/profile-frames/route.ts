import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";

async function getReviewer() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  if (!(await hasAnyRole(user.id, ["owner", "admin"]))) {
    return { user: null, response: NextResponse.json({ error: "Owner or Admin access required" }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function GET() {
  const { user, response } = await getReviewer();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const admin = createAdminClient();
  const { data: orders, error } = await admin.from("profile_frame_orders")
    .select("id,user_id,frame_id,price_inr,status,payment_reference,xp_awarded,created_at,submitted_at,reviewed_at")
    .eq("status", "submitted")
    .order("created_at", { ascending: false }).limit(200);
  if (error) {
    console.error("Could not load profile frame orders", error);
    return NextResponse.json({ error: "Could not load frame orders. Apply the profile frame store migration first." }, { status: 503 });
  }
  const userIds = [...new Set((orders ?? []).map((order) => order.user_id))];
  const { data: profiles, error: profilesError } = userIds.length
    ? await admin.from("profiles").select("id,username,display_name").in("id", userIds)
    : { data: [], error: null };
  if (profilesError) return NextResponse.json({ error: "Could not load order accounts" }, { status: 500 });
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return NextResponse.json({ orders: (orders ?? []).map((order) => ({ ...order, profile: profileById.get(order.user_id) ?? null })) }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function PATCH(request: Request) {
  const { user, response } = await getReviewer();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { orderId, action } = body as { orderId?: unknown; action?: unknown };
  if (typeof orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(orderId) || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "Choose a valid order and review action" }, { status: 400 });
  }
  const { data, error } = await createAdminClient().rpc("review_profile_frame_order", { p_order_id: orderId, p_reviewer_id: user.id, p_action: action });
  if (error) {
    console.error("Could not review profile frame order", error);
    const conflict = error.message.includes("no longer awaiting review") || error.message.includes("already owns");
    return NextResponse.json({ error: conflict ? error.message : "Could not review this order" }, { status: conflict ? 409 : 500 });
  }
  return NextResponse.json(data);
}
