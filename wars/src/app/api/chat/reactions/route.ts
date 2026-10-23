import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reactionSchema } from "@/lib/validation/chat";

// POST /api/chat/reactions — toggle a reaction
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = reactionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { message_id, reaction } = parsed.data;

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
