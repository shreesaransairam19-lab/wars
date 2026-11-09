import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { feedbackSchema } from "@/lib/validation/feedback";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";
import { stripHtml } from "@/lib/security/sanitize";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const limit = checkRateLimit(`feedback:${user?.id ?? getClientIp(request)}`, RATE_LIMITS.feedback.max, RATE_LIMITS.feedback.windowMs);
  if (!limit.allowed) return NextResponse.json({ error: "Please wait before sending more feedback." }, { status: 429 });
  const parsed = feedbackSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid feedback" }, { status: 400 });
  const { error } = await supabase.from("feedback").insert({ sender_id: user?.id ?? null, name: stripHtml(parsed.data.name ?? "").trim() || null, content: stripHtml(parsed.data.content).trim() });
  if (error) return NextResponse.json({ error: "Could not submit feedback" }, { status: 500 });
  return NextResponse.json({ success: true }, { status: 201 });
}
