import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewSchema } from "@/lib/validation/reviews";
import { sanitizeReview, containsHarmfulContent } from "@/lib/security/sanitize";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";
import { hasRole } from "@/lib/permissions/guards";
import { XP_REWARDS } from "@/lib/xp/calculate";
import { z } from "zod";

// GET /api/reviews?series_id=xxx — approved reviews
export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const seriesId = url.searchParams.get("series_id");

  if (!seriesId) {
    return NextResponse.json({ error: "series_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(
      `id, content, created_at, chapter_id,
       profiles:user_id (username, avatar_path),
       chapters (chapter_number)`
    )
    .eq("series_id", seriesId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }

  return NextResponse.json({ reviews: data });
}

// POST /api/reviews — submit (pending moderation)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = checkRateLimit(
    `review:${user.id}:${getClientIp(request)}`,
    RATE_LIMITS.review.max,
    RATE_LIMITS.review.windowMs
  );
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many reviews. Try again shortly." },
      { status: 429 }
    );
  }

  const parsed = reviewSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const content = sanitizeReview(parsed.data.content);
  if (!content || containsHarmfulContent(content)) {
    return NextResponse.json({ error: "Review rejected" }, { status: 400 });
  }

  const { data: review, error } = await supabase
    .from("reviews")
    .insert({
      user_id: user.id,
      series_id: parsed.data.series_id,
      chapter_id: parsed.data.chapter_id ?? null,
      content,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !review) {
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }

  // Award XP (best-effort; xp_ledger is service-role write only)
  await createAdminClient().from("xp_ledger").insert({
    user_id: user.id,
    amount: XP_REWARDS.review_posted,
    reason: "review_posted",
    source_id: review.id,
  });

  return NextResponse.json({ success: true, id: review.id }, { status: 201 });
}

const moderateSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["approve", "reject", "remove"]),
});

// PATCH /api/reviews — moderator action
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await hasRole(user.id, "moderator"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = moderateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const statusMap = {
    approve: "approved",
    reject: "rejected",
    remove: "removed",
  } as const;

  const { error } = await supabase
    .from("reviews")
    .update({ status: statusMap[parsed.data.action], updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) {
    return NextResponse.json({ error: "Failed to moderate" }, { status: 500 });
  }

  await supabase.from("moderation_actions").insert({
    actor_id: user.id,
    target_type: "review",
    target_id: parsed.data.id,
    action:
      parsed.data.action === "approve"
        ? "approve_review"
        : parsed.data.action === "reject"
          ? "reject_review"
          : "remove_review",
  });

  return NextResponse.json({ success: true });
}
