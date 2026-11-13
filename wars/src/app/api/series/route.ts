import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { seriesSchema } from "@/lib/validation/series";
import { canManageContentType, getManageableContentTypes, hasRole } from "@/lib/permissions/guards";
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
  let manageableTypes: string[] = [];
  if (all) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    manageableTypes = await getManageableContentTypes(user.id);
    if (manageableTypes.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const result = all
    ? await db.from("series").select("*").in("content_type", manageableTypes).order("created_at", { ascending: false })
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

  if (!(await canManageContentType(user.id, parsed.data.content_type))) {
    return NextResponse.json({ error: "Your role cannot manage this library" }, { status: 403 });
  }

  // Use the server admin client after checking the member's library-specific role.
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

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin.from("series")
    .select("content_type").eq("id", id).maybeSingle();
  if (existingError || !existing) return NextResponse.json({ error: "Series not found" }, { status: 404 });
  const targetType = parsed.data.content_type ?? existing.content_type;
  if (!(await canManageContentType(user.id, existing.content_type)) || !(await canManageContentType(user.id, targetType))) {
    return NextResponse.json({ error: "Your role cannot manage this library" }, { status: 403 });
  }

  const { data, error } = await admin
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

  const admin = createAdminClient();
  const { data: series, error: seriesError } = await admin
    .from("series")
    .select("id, cover_path")
    .eq("id", id)
    .maybeSingle();

  if (seriesError) {
    console.error("Series delete lookup failed", { code: seriesError.code, message: seriesError.message });
    return NextResponse.json({ error: "Could not load the series to delete" }, { status: 500 });
  }
  if (!series) return NextResponse.json({ error: "Series not found" }, { status: 404 });

  const { data: chapterRows, error: chapterError } = await admin
    .from("chapters")
    .select("id")
    .eq("series_id", id);
  if (chapterError) {
    console.error("Series chapter cleanup lookup failed", { code: chapterError.code, message: chapterError.message });
    return NextResponse.json({ error: "Could not inspect the series chapters" }, { status: 500 });
  }

  const chapterIds = (chapterRows ?? []).map((chapter) => chapter.id);
  let assetPaths: string[] = [];
  if (chapterIds.length > 0) {
    const { data: assets, error: assetError } = await admin
      .from("chapter_assets")
      .select("storage_path")
      .in("chapter_id", chapterIds);
    if (assetError) {
      console.error("Series asset cleanup lookup failed", { code: assetError.code, message: assetError.message });
      return NextResponse.json({ error: "Could not inspect the series files" }, { status: 500 });
    }
    assetPaths = (assets ?? [])
      .map((asset) => asset.storage_path)
      .filter((path): path is string => typeof path === "string" && path.length > 0);
  }

  // The session and Owner/Admin role are verified above; the server admin
  // This delete runs after the Owner/Admin role check.
  const { error } = await admin.from("series").delete().eq("id", id);

  if (error) {
    console.error("Series delete failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Failed to delete series" }, { status: 500 });
  }

  const cleanupFailures: string[] = [];
  if (assetPaths.length > 0) {
    for (let start = 0; start < assetPaths.length; start += 100) {
      const { error: storageError } = await admin.storage
        .from("chapter-assets")
        .remove(assetPaths.slice(start, start + 100));
      if (storageError) cleanupFailures.push(storageError.message);
    }
  }
  if (series.cover_path) {
    const coverObjectPath = series.cover_path.startsWith("covers/")
      ? series.cover_path.slice("covers/".length)
      : series.cover_path;
    const { error: coverError } = await admin.storage.from("covers").remove([coverObjectPath]);
    if (coverError) cleanupFailures.push(coverError.message);
  }

  if (cleanupFailures.length > 0) {
    console.error("Series deleted but some files could not be removed", cleanupFailures);
    return NextResponse.json({
      success: true,
      warning: "The series was deleted, but some stored files could not be cleaned up.",
    });
  }

  return NextResponse.json({ success: true });
}
