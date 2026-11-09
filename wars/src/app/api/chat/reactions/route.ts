import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reactionSchema } from "@/lib/validation/chat";
import { getActiveChatBan } from "@/lib/moderation/chat-ban";

// POST /api/chat/reactions — toggle a reaction
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (await getActiveChatBan(user.id)) return NextResponse.json({ error: "Your WARS chat access is banned" }, { status: 403 });

  const parsed = reactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { message_id, reaction } = parsed.data;
  const { data: message } = await supabase.from("chat_messages").select("room_id").eq("id", message_id).maybeSingle();
  if (!message) return NextResponse.json({ error: "Message not found" }, { status: 404 });
  const { data: membership } = await supabase.from("chat_room_members").select("muted_until").eq("room_id", message.room_id).eq("user_id", user.id).maybeSingle();
  if (membership?.muted_until && new Date(membership.muted_until).getTime() > Date.now()) {
    return NextResponse.json({ error: "You are muted in this room" }, { status: 403 });
  }

  const { data: existing } = await supabase
    .from("message_reactions")
    .select("message_id")
    .eq("message_id", message_id)
    .eq("user_id", user.id)
    .eq("reaction", reaction)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", message_id)
      .eq("user_id", user.id)
      .eq("reaction", reaction);

    if (error) {
      return NextResponse.json({ error: "Failed to remove reaction" }, { status: 500 });
    }
    return NextResponse.json({ added: false });
  }

  const { error } = await supabase.from("message_reactions").insert({
    message_id,
    user_id: user.id,
    reaction,
  });

  if (error) {
    return NextResponse.json({ error: "Failed to add reaction" }, { status: 500 });
  }

  return NextResponse.json({ added: true });
}
