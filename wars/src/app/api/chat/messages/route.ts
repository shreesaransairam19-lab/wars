import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chatMessageSchema } from "@/lib/validation/chat";
import { sanitizeChatMessage, containsHarmfulContent } from "@/lib/security/sanitize";
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

  let query = supabase
    .from("chat_messages")
    .select(
      `id, content, message_type, created_at, is_deleted, sender_id,
       profiles:sender_id (username, avatar_path),
       message_reactions (reaction, user_id)`
    )
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (before) {
    query = query.lt("created_at", before);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }

  return NextResponse.json({ messages: (data ?? []).reverse() });
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

  if (parsed.data.message_type === "image" && !/^https:\/\//.test(content)) {
    return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
  }

  const { data: message, error } = await supabase
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
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  // XP with daily cap (service-role write only)
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const admin = createAdminClient();
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
