import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getActiveChatBan } from "@/lib/moderation/chat-ban";

const appealSchema = z.object({ content: z.string().trim().min(10).max(3000) });

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const ban = await getActiveChatBan(user.id);
  if (!ban) return NextResponse.json({ ban: null, appeal: null });
  const admin = createAdminClient();
  const { data: appeal, error } = await admin.from("ban_appeals").select("id,status,created_at").eq("user_id", user.id).eq("status", "pending").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) return NextResponse.json({ error: "Could not load your appeal status" }, { status: 500 });
  return NextResponse.json({ ban, appeal }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const ban = await getActiveChatBan(user.id);
  if (!ban) return NextResponse.json({ error: "There is no active WARS chat ban to appeal" }, { status: 400 });
  const parsed = appealSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Write an appeal between 10 and 3000 characters" }, { status: 400 });
  const admin = createAdminClient();
  const { data: pending, error: lookupError } = await admin.from("ban_appeals").select("id").eq("user_id", user.id).eq("status", "pending").limit(1).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Could not check existing appeals" }, { status: 500 });
  if (pending) return NextResponse.json({ error: "You already have a pending appeal" }, { status: 409 });
  const { error } = await admin.from("ban_appeals").insert({ user_id: user.id, content: parsed.data.content });
  if (error) return NextResponse.json({ error: "Could not submit your appeal" }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
