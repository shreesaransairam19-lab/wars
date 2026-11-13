import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reviewSchema } from "@/lib/validation/reviews";
import { sanitizeReview, containsHarmfulContent } from "@/lib/security/sanitize";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/security/rate-limit";
import { hasRole } from "@/lib/permissions/guards";
import { XP_REWARDS } from "@/lib/xp/calculate";
import { z } from "zod";
import { randomUUID } from "node:crypto";

// GET /api/reviews?series_id=xxx — approved reviews plus the signed-in user's pending reviews
export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const seriesId = url.searchParams.get("series_id");

  if (!seriesId) {
    return NextResponse.json({ error: "series_id required" }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("reviews")
    .select(
      `id, content, created_at, chapter_id, status,
       profiles:profiles!reviews_user_id_fkey (id, username, avatar_path),
       chapters:chapters!reviews_chapter_id_fkey (chapter_number)`
    )
    .eq("series_id", seriesId)
    .order("created_at", { ascending: false })
    .limit(50);

  // RLS allows readers to see only approved reviews and their own pending review(s).
  // Keep the filter aligned with that policy so authors can confirm their submission.
  query = user
    ? query.or(`status.eq.approved,and(status.eq.pending,user_id.eq.${user.id})`)
    : query.eq("status", "approved");

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch reviews", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }

  type ReviewProfile = { id: string; username: string; avatar_path: string | null };
  const reviews = (data ?? []) as unknown as {
    id: string;
    profiles: ReviewProfile | ReviewProfile[] | null;
    [key: string]: unknown;
  }[];
  const profileFor = (row: (typeof reviews)[number]) =>
    Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles;
  const userIds = [...new Set(reviews.map((row) => profileFor(row)?.id).filter((id): id is string => Boolean(id)))];
  const rolesByUser = new Map<string, string>();
  const framesByUser = new Map<string, string>();

  if (userIds.length > 0) {
    const admin = createAdminClient();
    const [{ data: roleRows, error: rolesError }, { data: equippedFrames }] = await Promise.all([
      admin.from("user_roles").select("user_id, roles(name)").in("user_id", userIds),
      admin.from("profile_frame_equipped").select("user_id,frame_id").in("user_id", userIds),
    ]);
    for (const equipped of equippedFrames ?? []) framesByUser.set(equipped.user_id, equipped.frame_id);
    if (rolesError) {
      console.error("Could not load reviewer roles", rolesError);
    } else {
      const rolePriority = ["owner", "codester", "admin", "editor", "manga_editor", "anime_editor", "moderator", "donator", "reader"];
      const assignments = (roleRows ?? []) as {
        user_id: string;
        roles: { name: string } | { name: string }[] | null;
      }[];
      for (const assignment of assignments ?? []) {
        const joinedRoles = assignment.roles;
        const assigned = (Array.isArray(joinedRoles) ? joinedRoles : joinedRoles ? [joinedRoles] : [])
          .map((role) => role.name.trim().toLowerCase());
        rolesByUser.set(
          assignment.user_id,
          rolePriority.find((role) => assigned.includes(role)) ?? assigned[0] ?? "reader"
        );
      }
    }
  }

  const reviewsWithRoles = reviews.map((row) => {
    const profile = profileFor(row);
    return {
      ...row,
      profiles: profile
        ? { ...profile, role: rolesByUser.get(profile.id) ?? "reader", frame_id: framesByUser.get(profile.id) ?? null }
        : null,
    };
  });

  return NextResponse.json({ reviews: reviewsWithRoles });
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

  const reviewId = randomUUID();
  const { error } = await supabase
    .from("reviews")
    .insert({
      id: reviewId,
      user_id: user.id,
      series_id: parsed.data.series_id,
      chapter_id: parsed.data.chapter_id ?? null,
      content,
      status: "pending",
    });

  if (error) {
    console.error("Failed to submit review", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }

  // Award XP (best-effort; xp_ledger is service-role write only)
  await createAdminClient().from("xp_ledger").insert({
    user_id: user.id,
    amount: XP_REWARDS.review_posted,
    reason: "review_posted",
    source_id: reviewId,
  });

  return NextResponse.json({ success: true, id: reviewId }, { status: 201 });
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
