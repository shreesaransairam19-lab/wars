import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasAnyRole } from "@/lib/permissions/guards";
import { chatMessageSchema } from "@/lib/validation/chat";
import { sanitizeChatMessage, containsHarmfulContent } from "@/lib/security/sanitize";
import { containsProfanity } from "@/lib/security/profanity";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";
import { XP_REWARDS, XP_DAILY_CAPS } from "@/lib/xp/calculate";

// GET /api/chat/messages?room_id=xxx&before=iso
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const roomId = url.searchParams.get("room_id");
  const before = url.searchParams.get("before");

  if (!roomId) {
    return NextResponse.json({ error: "room_id required" }, { status: 400 });
  }

  // Private conversations must never rely on a client supplied room id alone.
  const admin = createAdminClient();
  const { data: room, error: roomError } = await admin.from("chat_rooms").select("id,slug,room_type,visibility").eq("id", roomId).maybeSingle();
  if (roomError) {
    const isAdmin = await hasAnyRole(user.id, ["owner", "admin"]);
    return NextResponse.json({ error: isAdmin ? `Chat room lookup failed (${roomError.code ?? "database"}): ${roomError.message}` : "Could not load this chat room" }, { status: 500 });
  }
  if (!room) return NextResponse.json({ error: "Chat room not found" }, { status: 404 });
  if (room.visibility === "private") {
    const { data: membership } = await admin.from("chat_room_members").select("room_id").eq("room_id", roomId).eq("user_id", user.id).maybeSingle();
    if (!membership) return NextResponse.json({ error: "You are not a member of this conversation" }, { status: 403 });
  }

  // We have checked public visibility or private-room membership above, so use
  // the service client here to avoid chat reads failing on inconsistent RLS.
  let query = admin
    .from("chat_messages")
    .select(
      `id, content, message_type, created_at, is_deleted, sender_id,
       profiles:sender_id (username, display_name, avatar_path),
       message_reactions (reaction, user_id)`
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(room.slug === "general-chat-general" ? 30 : 50);

  if (before) {
    query = query.lt("created_at", before);
  }

  let result: Awaited<typeof query>;
  try {
    result = await query;
  } catch (cause) {
    const isAdmin = await hasAnyRole(user.id, ["owner", "admin"]);
    const detail = cause instanceof Error ? cause.message : String(cause);
    return NextResponse.json({ error: isAdmin ? `Chat request failed: ${detail}` : "Chat messages are temporarily unavailable" }, { status: 503 });
  }
  const { data, error } = result;
  if (error) {
    const isAdmin = await hasAnyRole(user.id, ["owner", "admin"]);
    return NextResponse.json({ error: isAdmin ? `Failed to fetch messages (${error.code ?? "database"}): ${error.message}` : "Failed to fetch messages" }, { status: 500 });
  }

  const messages = (data ?? []).reverse().map((message) => ({
    ...message,
    profiles: Array.isArray(message.profiles) ? message.profiles[0] ?? null : message.profiles,
    content: message.is_deleted ? "This message was removed." : message.content,
  }));

  const senderIds = [...new Set(messages.map((message) => message.sender_id))];
  const rolesByUser = new Map<string, string[]>();
  if (senderIds.length > 0) {
    const { data: roleRows } = await admin
      .from("user_roles")
      .select("user_id, roles(name)")
      .in("user_id", senderIds);
    const assignments = (roleRows ?? []) as {
      user_id: string;
      roles: { name: string } | { name: string }[] | null;
    }[];
    for (const assignment of assignments) {
      const roleRowsForUser = Array.isArray(assignment.roles)
        ? assignment.roles
        : assignment.roles
          ? [assignment.roles]
          : [];
      const current = rolesByUser.get(assignment.user_id) ?? [];
      rolesByUser.set(assignment.user_id, [...current, ...roleRowsForUser.map((role) => role.name)]);
    }
  }
  const rolePriority = ["owner", "admin", "editor", "moderator", "donator", "reader"];
  const messagesWithRoles = messages.map((message) => {
    const roles = rolesByUser.get(message.sender_id) ?? ["reader"];
    const primaryRole = rolePriority.find((role) => roles.includes(role)) ?? "reader";
    return {
      ...message,
      profiles: message.profiles ? { ...message.profiles, role: primaryRole } : null,
    };
  });

  return NextResponse.json(
    { messages: messagesWithRoles },
    { headers: { "Cache-Control": "private, no-store, max-age=0" } }
  );
}

// POST /api/chat/messages
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(
    `chat:${user.id}:${getClientIp(request)}`,
    RATE_LIMITS.chat.max,
    RATE_LIMITS.chat.windowMs
  );
  if (!limit.allowed) {
    return NextResponse.json({ error: "Slow down a little." }, { status: 429 });
  }

  const parsed = chatMessageSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const content = sanitizeChatMessage(parsed.data.content);
  if (!content || containsHarmfulContent(content)) {
    return NextResponse.json({ error: "Message rejected" }, { status: 400 });
  }

  if (parsed.data.message_type === "text" && containsProfanity(content)) {
    return NextResponse.json(
      { error: "That message contains language blocked by the chat filter. Please rephrase it." },
      { status: 400 }
    );
  }

  if (parsed.data.message_type === "image" && !/^https:\/\//.test(content)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: targetRoom, error: roomError } = await admin.from("chat_rooms").select("id,slug,room_type,visibility").eq("id", parsed.data.room_id).maybeSingle();
  if (roomError) {
    const isAdmin = await hasAnyRole(user.id, ["owner", "admin"]);
    return NextResponse.json({ error: isAdmin ? `Could not verify chat room (${roomError.code ?? "database"}): ${roomError.message}` : "Could not verify this chat room" }, { status: 500 });
  }
  if (!targetRoom) return NextResponse.json({ error: "Chat room not found" }, { status: 404 });
  const { data: membership, error: membershipError } = await admin
    .from("chat_room_members")
    .select("room_id,muted_until")
    .eq("room_id", targetRoom.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError) {
    const isAdmin = await hasAnyRole(user.id, ["owner", "admin"]);
    return NextResponse.json({ error: isAdmin ? `Could not verify chat membership (${membershipError.code ?? "database"}): ${membershipError.message}` : "Could not verify chat access" }, { status: 500 });
  }
  if ((targetRoom.visibility === "private" || targetRoom.room_type === "dm") && !membership) {
    return NextResponse.json({ error: "You are not a member of this conversation" }, { status: 403 });
  }
  if (membership?.muted_until && new Date(membership.muted_until).getTime() > Date.now()) {
    return NextResponse.json({ error: "You are muted in this room" }, { status: 403 });
  }

  const { data: message, error } = await admin
    .from("chat_messages")
    .insert({
      room_id: parsed.data.room_id,
      sender_id: user.id,
      content,
      message_type: parsed.data.message_type,
      reply_to: parsed.data.reply_to ?? null,
    })
    .select("id")
    .single();

  if (error || !message) {
    const isAdmin = await hasAnyRole(user.id, ["owner", "admin"]);
    return NextResponse.json({ error: isAdmin ? `Failed to send message (${error?.code ?? "database"}): ${error?.message ?? "No message returned"}` : "Failed to send message" }, { status: 500 });
  }

  // XP with daily cap (service-role write only)
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const { count } = await admin
    .from("xp_ledger")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("reason", "send_message")
    .gte("created_at", dayStart.toISOString());

  if ((count ?? 0) < XP_DAILY_CAPS.send_message) {
    await admin.from("xp_ledger").insert({
      user_id: user.id,
      amount: XP_REWARDS.send_message,
      reason: "send_message",
      source_id: message.id,
    });
  }

  return NextResponse.json({ success: true, id: message.id }, { status: 201 });
}
