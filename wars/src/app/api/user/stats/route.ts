import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLevelProgress, getRank, XP_REWARDS } from "@/lib/xp/calculate";

const XP_PAGE_SIZE = 1000;

async function getUserXpRows(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const rows: { amount: number; reason: string }[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin
      .from("xp_ledger")
      .select("amount,reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + XP_PAGE_SIZE - 1);

    if (error) return { rows: null, error };

    const page = data ?? [];
    rows.push(...page);
    if (page.length < XP_PAGE_SIZE) return { rows, error: null };
    offset += page.length;
  }
}

// GET /api/user/stats — XP, level, rank, counts
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The session verifies identity; use the server client for consistent,
  // user-scoped aggregates even when production RLS policies differ.
  const admin = createAdminClient();
  const [xpResult, progressResult, reviewResult, chatResult] = await Promise.all([
    getUserXpRows(admin, user.id),
    admin
      .from("reading_progress")
      .select("chapter_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true),
    admin
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "removed"),
    admin
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", user.id)
      .eq("is_deleted", false),
  ]);

  if (xpResult.error || progressResult.error || reviewResult.error || chatResult.error) {
    console.error("Dashboard stats query failed", {
      xp: xpResult.error,
      progress: progressResult.error,
      reviews: reviewResult.error,
      chat: chatResult.error,
    });
    return NextResponse.json({ error: "Could not load dashboard stats" }, { status: 500 });
  }

  const chaptersRead = progressResult.count ?? 0;
  const reviewsPosted = reviewResult.count ?? 0;
  const chatMessages = chatResult.count ?? 0;
  // Read XP is derived from completed chapters so every completion earns the
  // configured reward, including chapters completed before this calculation.
  const ledgerRows = xpResult.rows ?? [];
  const otherLedgerXp = ledgerRows
    .filter((row) => row.reason !== "read_chapter")
    .reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const recordedReadXp = ledgerRows
    .filter((row) => row.reason === "read_chapter")
    .reduce((sum, row) => sum + (row.amount ?? 0), 0);
  const readXp = Math.max(recordedReadXp, chaptersRead * XP_REWARDS.read_chapter);
  const totalXp = otherLedgerXp + readXp;
  const levelInfo = getLevelProgress(totalXp);
  const rank = getRank(levelInfo.currentLevel);

  return NextResponse.json({
    totalXp,
    level: levelInfo.currentLevel,
    rank,
    progress: levelInfo.progress,
    currentLevelXp: levelInfo.currentLevelXp,
    nextLevelXp: levelInfo.nextLevelXp,
    chaptersRead,
    reviewsPosted,
    chatMessages,
  }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
