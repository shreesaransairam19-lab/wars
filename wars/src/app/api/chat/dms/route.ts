import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const startSchema = z.object({ username: z.string().trim().min(2).max(32) });
const blockedRecipientRoles = new Set(["owner", "admin", "editor"]);

async function rolesFor(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data } = await admin.from("user_roles").select("roles(name)").eq("user_id", userId);
  return (data ?? []).flatMap((row) => {
    const roles = row.roles;
    return (Array.isArray(roles) ? roles : roles ? [roles] : []).map((role) => role.name);
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data: memberships, error } = await admin.from("chat_room_members").select("room_id").eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "Could not load conversations" }, { status: 500 });
  const ids = (memberships ?? []).map((membership) => membership.room_id);
  if (!ids.length) return NextResponse.json({ conversations: [] });
  const { data: rooms, error: roomError } = await admin.from("chat_rooms").select("id,name,slug,room_type,parent_room_id").in("id", ids).eq("room_type", "dm");
  if (roomError) return NextResponse.json({ error: "Could not load conversations" }, { status: 500 });
  const conversations = await Promise.all((rooms ?? []).map(async (room) => {
    const { data: peers } = await admin.from("chat_room_members").select("user_id, profiles:user_id(username, display_name)").eq("room_id", room.id).neq("user_id", user.id);
    const peer = peers?.[0] as { user_id: string; profiles: { username: string; display_name: string | null } | { username: string; display_name: string | null }[] | null } | undefined;
    const profile = Array.isArray(peer?.profiles) ? peer.profiles[0] : peer?.profiles;
    return { ...room, name: profile?.display_name || profile?.username || room.name, username: profile?.username ?? "", peer_id: peer?.user_id ?? null };
  }));
  return NextResponse.json({ conversations });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = startSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid username" }, { status: 400 });
  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id,username,display_name").ilike("username", parsed.data.username).maybeSingle();
  if (!target) return NextResponse.json({ error: "No WARS member found with that username" }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 });
  const targetRoles = await rolesFor(admin, target.id);
  if (targetRoles.some((role) => blockedRecipientRoles.has(role))) {
    return NextResponse.json({ error: "Please use Feedback to contact Owner, Admin, or Editor accounts" }, { status: 403 });
  }
  const { data: existingMemberships } = await admin.from("chat_room_members").select("room_id").eq("user_id", user.id);
  const ownRoomIds = (existingMemberships ?? []).map((row) => row.room_id);
  if (ownRoomIds.length) {
    const { data: dmRooms } = await admin.from("chat_rooms").select("id,name,slug,room_type,parent_room_id").in("id", ownRoomIds).eq("room_type", "dm");
    const dmRoomIds = (dmRooms ?? []).map((room) => room.id);
    if (dmRoomIds.length) {
      const { data: matching } = await admin.from("chat_room_members").select("room_id").eq("user_id", target.id).in("room_id", dmRoomIds);
      const existing = dmRooms?.find((room) => room.id === matching?.[0]?.room_id);
      if (existing) return NextResponse.json({ conversation: { ...existing, name: target.display_name || target.username, username: target.username, peer_id: target.id } });
    }
  }
  const slug = `dm-${crypto.randomUUID()}`;
  const { data: room, error: roomError } = await admin.from("chat_rooms").insert({ name: `Direct message`, slug, room_type: "dm", visibility: "private", created_by: user.id }).select("id,name,slug,room_type,parent_room_id").single();
  if (roomError || !room) return NextResponse.json({ error: "Could not start conversation" }, { status: 500 });
  const { error: membersError } = await admin.from("chat_room_members").insert([{ room_id: room.id, user_id: user.id }, { room_id: room.id, user_id: target.id }]);
  if (membersError) {
    await admin.from("chat_rooms").delete().eq("id", room.id);
    return NextResponse.json({ error: "Could not start conversation" }, { status: 500 });
  }
  return NextResponse.json({ conversation: { ...room, name: target.display_name || target.username, username: target.username, peer_id: target.id } }, { status: 201 });
}
