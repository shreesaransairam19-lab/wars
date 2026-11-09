import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seriesSchema } from "@/lib/validation/series";
import { hasRole } from "@/lib/permissions/guards";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/security/rate-limit";

// GET /api/series — list published series (public) or all (staff)
export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const all = url.searchParams.get("all") === "true";

  // Staff-only listings include draft/archived records. Verify the session
  // and role first, then read with the server client so production RLS cannot
  // silently hide existing series from the content manager.
  const db = createAdminClient();
  if (all) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!(await hasRole(user.id, "editor"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const result = all
    ? await db.from("series").select("*").order("created_at", { ascending: false })
    : await db
        .from("series")
        .select("id, title, slug, description, content_type, cover_path, status, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });

  const { data, error } = result;

  if (error) {
    console.error("Series list query failed", { code: error.code, message: error.message, details: error.details });
    return NextResponse.json(
      { error: all ? `Failed to fetch series: ${error.message}` : "Failed to fetch series" },
      { status: 500 }
    );
  }

  const series = data ?? [];
  const chapterCounts = new Map<string, number>();
  const ratingsBySeries = new Map<string, { rating: number }[]>();
  if (series.length > 0) {
    let chapterQuery = db.from("chapters").select("series_id").in("series_id", series.map((item) => item.id));
    if (!all) chapterQuery = chapterQuery.eq("status", "published");
    const [{ data: chapterRows, error: chaptersError }, ratingsResult] = await Promise.all([
      chapterQuery,
      db.from("ratings").select("series_id, rating").in("series_id", series.map((item) => item.id)),
    ]);
    if (chaptersError) {
      console.error("Series chapter counts query failed", { code: chaptersError.code, message: chaptersError.message });
      return NextResponse.json(
        { error: all ? `Failed to count chapters: ${chaptersError.message}` : "Failed to fetch series" },
        { status: 500 }
      );
    }
    for (const chapter of chapterRows ?? []) {
      chapterCounts.set(chapter.series_id, (chapterCounts.get(chapter.series_id) ?? 0) + 1);
    }
    if (ratingsResult.error) {
      console.error("Series ratings query failed", { code: ratingsResult.error.code, message: ratingsResult.error.message });
      return NextResponse.json({ error: "Failed to fetch series ratings" }, { status: 500 });
    }
    for (const rating of ratingsResult.data ?? []) {
      const current = ratingsBySeries.get(rating.series_id) ?? [];
      current.push({ rating: rating.rating });
      ratingsBySeries.set(rating.series_id, current);
    }
  }

  return NextResponse.json({
    series: series.map((item) => ({
      ...item,
      chapters: [{ count: chapterCounts.get(item.id) ?? 0 }],
      ratings: ratingsBySeries.get(item.id) ?? [],
    })),
  });
}

// POST /api/series — create series (editor+)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canEdit = await hasRole(user.id, "editor");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = getClientIp(request);
  const rate = checkRateLimit(`series-create:${ip}`, RATE_LIMITS.upload.max, RATE_LIMITS.upload.windowMs);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = seriesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  // Role authorization above is the gate; use the server admin client for the
  // insert so a stale/missing production RLS policy cannot reject staff work.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("series")
    .insert({
      ...parsed.data,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("Series creation failed", { code: error.code, message: error.message, details: error.details });
    return NextResponse.json({ error: `Failed to create series: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ series: data }, { status: 201 });
}

// PATCH /api/series — update series (editor+)
export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const canEdit = await hasRole(user.id, "editor");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Series ID required" }, { status: 400 });
  }

  const parsed = seriesSchema.partial().safeParse(updates);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("series")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update series" }, { status: 500 });
  }

  return NextResponse.json({ series: data });
}

// DELETE /api/series?id=xxx — delete series (admin+)
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await hasRole(user.id, "admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Series ID required" }, { status: 400 });
  }

  const { error } = await supabase.from("series").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete series" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
