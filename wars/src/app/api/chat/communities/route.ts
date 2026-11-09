import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";
import { getActiveChatBan } from "@/lib/moderation/chat-ban";

const communitySchema = z.object({ name: z.string().trim().min(2).max(48) });
const roomSchema = z.object({ community_id: z.string().uuid(), name: z.string().trim().min(2).max(48) });
const slugify = (value: string) => value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);

async function authorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user, allowed: Boolean(user && await hasAnyRole(user.id, ["owner", "admin"])) };
}

export async function POST(request: Request) {
  const { user, allowed } = await authorized();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await getActiveChatBan(user.id)) return NextResponse.json({ error: "Your WARS chat access is banned" }, { status: 403 });
  if (!allowed) return NextResponse.json({ error: "Only Owner and Admin can manage communities" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const roomParsed = roomSchema.safeParse(body);
  const communityParsed = communitySchema.safeParse(body);
  const admin = createAdminClient();
  if (roomParsed.success) {
    const { data: parent } = await admin.from("chat_rooms").select("id,slug").eq("id", roomParsed.data.community_id).eq("room_type", "server").maybeSingle();
    if (!parent) return NextResponse.json({ error: "Community not found" }, { status: 404 });
    const name = roomParsed.data.name;
    const { data, error } = await admin.from("chat_rooms").insert({ name, slug: `${parent.slug}-${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`, room_type: "channel", visibility: "public", parent_room_id: parent.id, created_by: user.id }).select("*").single();
    if (error) return NextResponse.json({ error: `Could not create room: ${error.message}` }, { status: 500 });
    return NextResponse.json({ room: data }, { status: 201 });
  }
  if (!communityParsed.success) return NextResponse.json({ error: "Enter a community or room name" }, { status: 400 });
  const name = communityParsed.data.name;
  const { data, error } = await admin.from("chat_rooms").insert({ name, slug: `${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`, room_type: "server", visibility: "public", created_by: user.id }).select("*").single();
  if (error) return NextResponse.json({ error: `Could not create community: ${error.message}` }, { status: 500 });
  const { data: defaultRoom, error: defaultRoomError } = await admin.from("chat_rooms").insert({ name: "general", slug: `${data.slug}-general`, room_type: "channel", visibility: "public", parent_room_id: data.id, created_by: user.id }).select("*").single();
  if (defaultRoomError) {
    await admin.from("chat_rooms").delete().eq("id", data.id);
    return NextResponse.json({ error: `Could not create the community's general room: ${defaultRoomError.message}` }, { status: 500 });
  }
  return NextResponse.json({ community: data, defaultRoom }, { status: 201 });
}

export async function DELETE(request: Request) {
  const { user, allowed } = await authorized();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (await getActiveChatBan(user.id)) return NextResponse.json({ error: "Your WARS chat access is banned" }, { status: 403 });
  if (!allowed) return NextResponse.json({ error: "Only Owner and Admin can manage communities" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const parsed = z.object({ id: z.string().uuid(), room_type: z.enum(["server", "channel"]) }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  const admin = createAdminClient();
  const { data: targetRoom } = await admin.from("chat_rooms").select("slug").eq("id", parsed.data.id).maybeSingle();
  if (targetRoom?.slug === "general-chat" || targetRoom?.slug === "general-chat-general") {
    return NextResponse.json({ error: "The default General chat cannot be removed" }, { status: 400 });
  }
  const { error } = await admin.from("chat_rooms").delete().eq("id", parsed.data.id).eq("room_type", parsed.data.room_type);
  if (error) return NextResponse.json({ error: "Could not remove community or room" }, { status: 500 });
  return NextResponse.json({ success: true });
}
