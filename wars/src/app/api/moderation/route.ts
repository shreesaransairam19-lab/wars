import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserRoles, hasAnyRole, ROLE_HIERARCHY, type RoleName } from "@/lib/permissions/guards";

const actionSchema = z.object({
  action: z.enum(["mute", "unmute", "ban", "unban", "review_appeal"]),
  user_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  appeal_id: z.string().uuid().optional(),
  decision: z.enum(["approved", "rejected"]).optional(),
  duration_minutes: z.number().int().min(15).max(43_200).nullable().optional(),
  reason: z.string().trim().min(1).max(500).optional(),
}).superRefine((value, ctx) => {
  if (value.action === "review_appeal" && (!value.appeal_id || !value.decision)) {
    ctx.addIssue({ code: "custom", message: "Choose an appeal and decision" });
  }
  if (["mute", "unmute", "ban", "unban"].includes(value.action) && !value.user_id) {
    ctx.addIssue({ code: "custom", message: "Select a member" });
  }
  if (["mute", "unmute"].includes(value.action) && !value.room_id) {
    ctx.addIssue({ code: "custom", message: "Select a chat room" });
  }
});

async function signedInStaff() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, response: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  if (!(await hasAnyRole(user.id, ["owner", "admin", "moderator"]))) {
    return { user: null, response: NextResponse.json({ error: "Moderator, Admin, or Owner permissions required" }, { status: 403 }) };
  }
  return { user, response: null };
}

async function logAction(actorId: string | null, targetId: string, action: string, reason: string, expiresAt: string | null) {
  const admin = createAdminClient();
  const { error } = await admin.from("moderation_actions").insert({
    actor_id: actorId,
    target_type: "user",
    target_id: targetId,
    action,
    reason,
    expires_at: expiresAt,
  });
  return error;
}

export async function GET() {
  const { user, response } = await signedInStaff();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const isOwner = await hasAnyRole(user.id, ["owner"]);
  const isAdmin = await hasAnyRole(user.id, ["admin"]);
  const admin = createAdminClient();

  const [profilesResult, rolesResult, roomsResult, membershipsResult, bansResult, appealsResult, muteHistoryResult] = await Promise.all([
    admin.from("profiles").select("id,username,display_name").order("username").limit(1000),
    admin.from("user_roles").select("user_id,roles(name)").limit(5000),
    admin.from("chat_rooms").select("id,name,slug,room_type,parent_room_id").eq("room_type", "channel").order("name").limit(500),
    admin.from("chat_room_members").select("user_id,room_id,muted_until").not("muted_until", "is", null).limit(5000),
    admin.from("user_bans").select("user_id,reason,banned_by,created_at,expires_at").limit(1000),
    isOwner || isAdmin
      ? admin.from("ban_appeals").select("id,user_id,content,status,created_at,profiles:user_id(username,display_name)").eq("status", "pending").order("created_at").limit(100)
      : Promise.resolve({ data: [], error: null }),
    admin.from("moderation_actions").select("target_id").eq("target_type", "user").eq("action", "mute").limit(10000),
  ]);

  const failure = profilesResult.error ?? rolesResult.error ?? roomsResult.error ?? membershipsResult.error ?? bansResult.error ?? appealsResult.error ?? muteHistoryResult.error;
  if (failure) return NextResponse.json({ error: "Could not load moderation data. Apply the latest WARS database migrations and retry." }, { status: 503 });

  const rolesByUser = new Map<string, string[]>();
  for (const assignment of rolesResult.data ?? []) {
    const relation = assignment.roles;
    const roles = Array.isArray(relation) ? relation : relation ? [relation] : [];
    rolesByUser.set(assignment.user_id, [...(rolesByUser.get(assignment.user_id) ?? []), ...roles.map((role) => role.name.toLowerCase())]);
  }
  const now = Date.now();
  const activeBans = new Map((bansResult.data ?? []).filter((ban) => !ban.expires_at || new Date(ban.expires_at).getTime() > now).map((ban) => [ban.user_id, ban]));
  const roomById = new Map((roomsResult.data ?? []).map((room) => [room.id, room]));
  const activeMutes = (membershipsResult.data ?? []).filter((membership) => new Date(membership.muted_until!).getTime() > now && roomById.has(membership.room_id));
  const muteCounts = new Map<string, number>();
  for (const action of muteHistoryResult.data ?? []) muteCounts.set(action.target_id, (muteCounts.get(action.target_id) ?? 0) + 1);

  return NextResponse.json({
    members: (profilesResult.data ?? []).map((profile) => ({
      ...profile,
      roles: rolesByUser.get(profile.id) ?? ["reader"],
      ban: activeBans.get(profile.id) ?? null,
      mute_count: muteCounts.get(profile.id) ?? 0,
      mutes: activeMutes.filter((mute) => mute.user_id === profile.id).map((mute) => ({ ...mute, room: roomById.get(mute.room_id) })),
    })),
    rooms: roomsResult.data ?? [],
    appeals: appealsResult.data ?? [],
    permissions: { canMute: isOwner || await hasAnyRole(user.id, ["moderator"]), canBan: isOwner || isAdmin, canReviewAppeals: isOwner || isAdmin },
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}

export async function POST(request: Request) {
  const { user, response } = await signedInStaff();
  if (response) return response;
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid action" }, { status: 400 });
  const body = parsed.data;
  const actorRoles = await getUserRoles(user.id);
  const isOwner = actorRoles.some((role) => role === "owner" || role === "codester");
  const isAdmin = actorRoles.includes("admin");
  const isModerator = actorRoles.includes("moderator");
  const admin = createAdminClient();

  if (body.action === "review_appeal") {
    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Only Admin or Owner can review ban appeals" }, { status: 403 });
    const { data: appeal, error } = await admin.from("ban_appeals").select("id,user_id,status").eq("id", body.appeal_id!).maybeSingle();
    if (error || !appeal || appeal.status !== "pending") return NextResponse.json({ error: "This appeal is no longer pending" }, { status: 404 });
    const reviewedAt = new Date().toISOString();
    const { error: updateError } = await admin.from("ban_appeals").update({ status: body.decision!, reviewed_by: user.id, reviewed_at: reviewedAt }).eq("id", appeal.id);
    if (updateError) return NextResponse.json({ error: "Could not update this appeal" }, { status: 500 });
    if (body.decision === "approved") {
      const { error: unbanError } = await admin.from("user_bans").delete().eq("user_id", appeal.user_id);
      if (unbanError) return NextResponse.json({ error: "Appeal was approved, but the ban could not be removed" }, { status: 500 });
      await logAction(user.id, appeal.user_id, "unban", "Ban appeal approved", null);
    }
    return NextResponse.json({ success: true });
  }

  const targetId = body.user_id!;
  if (targetId === user.id) return NextResponse.json({ error: "You cannot moderate your own account" }, { status: 400 });
  const targetRolesResult = await admin.from("user_roles").select("roles(name)").eq("user_id", targetId);
  if (targetRolesResult.error) return NextResponse.json({ error: "Could not verify this member's roles" }, { status: 500 });
  const targetRoles = (targetRolesResult.data ?? []).flatMap((row) => {
    const relation = row.roles;
    return (Array.isArray(relation) ? relation : relation ? [relation] : []).map((role) => role.name.toLowerCase() as RoleName);
  });
  const targetRank = Math.max(...targetRoles.map((role) => ROLE_HIERARCHY[role] ?? 0), ROLE_HIERARCHY.reader);
  const actorRank = Math.max(...actorRoles.map((role) => ROLE_HIERARCHY[role]), 0);
  if (targetRank >= actorRank) return NextResponse.json({ error: "You can only moderate members with a lower role than yours" }, { status: 403 });

  if (body.action === "mute" || body.action === "unmute") {
    if (!isOwner && !isModerator) return NextResponse.json({ error: "Only Moderators and Owner can mute members" }, { status: 403 });
    if (!isOwner && targetRank >= ROLE_HIERARCHY.moderator) return NextResponse.json({ error: "Moderators can mute Readers and Donators" }, { status: 403 });
    const { data: room, error: roomError } = await admin.from("chat_rooms").select("id,room_type").eq("id", body.room_id!).maybeSingle();
    if (roomError || !room || room.room_type !== "channel") return NextResponse.json({ error: "Choose a valid community chat room" }, { status: 400 });
    const until = body.action === "mute" ? new Date(Date.now() + 2 * 60_000).toISOString() : null;
    const { data: existing, error: membershipError } = await admin.from("chat_room_members").select("user_id").eq("room_id", room.id).eq("user_id", targetId).maybeSingle();
    if (membershipError) return NextResponse.json({ error: "Could not check this member's room status" }, { status: 500 });
    const result = existing
      ? await admin.from("chat_room_members").update({ muted_until: until }).eq("room_id", room.id).eq("user_id", targetId)
      : await admin.from("chat_room_members").insert({ room_id: room.id, user_id: targetId, muted_until: until });
    if (result.error) return NextResponse.json({ error: "Could not update the member's mute" }, { status: 500 });
    const logError = await logAction(user.id, targetId, body.action, body.reason ?? (body.action === "mute" ? "Chat mute" : "Mute removed"), until);
    if (logError) return NextResponse.json({ error: "Mute changed, but its audit entry could not be saved" }, { status: 500 });
    let bannedForMuteLimit = false;
    if (body.action === "mute") {
      const { count, error: countError } = await admin.from("moderation_actions").select("id", { count: "exact", head: true }).eq("target_type", "user").eq("target_id", targetId).eq("action", "mute");
      if (countError) return NextResponse.json({ error: "Mute applied, but the mute limit could not be checked" }, { status: 500 });
      if ((count ?? 0) >= 5) {
        const reason = "Automatic ban: reached five chat mutes";
        const { error: banError } = await admin.from("user_bans").upsert({ user_id: targetId, banned_by: user.id, reason, expires_at: null }, { onConflict: "user_id" });
        if (banError) return NextResponse.json({ error: "Fifth mute recorded, but automatic ban needs the latest database migration" }, { status: 503 });
        await logAction(user.id, targetId, "ban", reason, null);
        bannedForMuteLimit = true;
      }
    }
    return NextResponse.json({ success: true, expires_at: until, banned: bannedForMuteLimit, mute_count: bannedForMuteLimit ? 5 : undefined });
  }

  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Only Admin or Owner can ban members" }, { status: 403 });
  if (body.action === "ban") {
    const expiresAt = body.duration_minutes == null ? null : new Date(Date.now() + body.duration_minutes * 60_000).toISOString();
    const reason = body.reason ?? "Community guidelines violation";
    const { error } = await admin.from("user_bans").upsert({ user_id: targetId, banned_by: user.id, reason, expires_at: expiresAt }, { onConflict: "user_id" });
    if (error) return NextResponse.json({ error: "Could not save the ban. Apply the latest WARS database migrations and retry." }, { status: 503 });
    const logError = await logAction(user.id, targetId, "ban", reason, expiresAt);
    if (logError) return NextResponse.json({ error: "Ban applied, but its audit entry could not be saved" }, { status: 500 });
    return NextResponse.json({ success: true, expires_at: expiresAt });
  }

  const { error } = await admin.from("user_bans").delete().eq("user_id", targetId);
  if (error) return NextResponse.json({ error: "Could not remove the ban" }, { status: 500 });
  const logError = await logAction(user.id, targetId, "unban", body.reason ?? "Chat ban removed", null);
  if (logError) return NextResponse.json({ error: "Ban removed, but its audit entry could not be saved" }, { status: 500 });
  return NextResponse.json({ success: true });
}
