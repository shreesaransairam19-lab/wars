import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLevelProgress, getRank } from "@/lib/xp/calculate";

// GET /api/user/stats — XP, level, rank, counts
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Sum XP
  const { data: xpData } = await supabase
    .from("xp_ledger")
    .select("amount")
    .eq("user_id", user.id);

  const totalXp = (xpData ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0);
  const levelInfo = getLevelProgress(totalXp);
  const rank = getRank(levelInfo.currentLevel);

  // Counts
  const [{ count: chaptersRead }, { count: reviewsPosted }] = await Promise.all([
    supabase
      .from("reading_progress")
      .select("chapter_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "approved"),
  ]);

  return NextResponse.json({
    totalXp,
    level: levelInfo.currentLevel,
    rank,
    progress: levelInfo.progress,
    currentLevelXp: levelInfo.currentLevelXp,
    nextLevelXp: levelInfo.nextLevelXp,
    chaptersRead: chaptersRead ?? 0,
    reviewsPosted: reviewsPosted ?? 0,
  });
}
