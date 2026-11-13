import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { chapterSchema } from "@/lib/validation/series";
import { canManageContentType, canManageChapter, getSeriesContentType } from "@/lib/permissions/guards";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/security/rate-limit";

// GET /api/chapters?series_id=xxx — list chapters for a series
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const url = new URL(request.url);
  const seriesId = url.searchParams.get("series_id");

  if (!seriesId) {
    return NextResponse.json({ error: "series_id required" }, { status: 400 });
  }

  const contentType = await getSeriesContentType(seriesId);
  const canManage = Boolean(user && contentType && await canManageContentType(user.id, contentType));
  const db = canManage ? createAdminClient() : supabase;
  const query = db
    .from("chapters")
    .select(canManage ? "*, chapter_assets(id, asset_type, storage_path, external_url, mime_type)" : "*, chapter_assets(count)")
    .eq("series_id", seriesId)
    .order("chapter_number", { ascending: true });
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to fetch chapters" }, { status: 500 });
  }

  return NextResponse.json({ chapters: data });
}

// POST /api/chapters — create chapter (editor+)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = getClientIp(request);
  const rate = checkRateLimit(`chapter-create:${ip}`, RATE_LIMITS.upload.max, RATE_LIMITS.upload.windowMs);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const body = await request.json();
  const parsed = chapterSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const seriesType = await getSeriesContentType(parsed.data.series_id);
  if (!seriesType) return NextResponse.json({ error: "Series not found" }, { status: 404 });
  if (!(await canManageContentType(user.id, seriesType))) {
    return NextResponse.json({ error: "Your role cannot add chapters to this library" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("chapters")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Chapter slug already exists in this series" }, { status: 409 });
    }
    return NextResponse.json({ error: `Failed to create chapter: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ chapter: data }, { status: 201 });
}

// PATCH /api/chapters — update chapter (editor+)
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
    return NextResponse.json({ error: "Chapter ID required" }, { status: 400 });
  }

  const parsed = chapterSchema.partial().safeParse(updates);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin.from("chapters").select("series_id").eq("id", id).maybeSingle();
  if (existingError || !existing) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  if (!(await canManageChapter(user.id, id))) {
    return NextResponse.json({ error: "Your role cannot edit this library" }, { status: 403 });
  }
  if (parsed.data.series_id && parsed.data.series_id !== existing.series_id) {
    return NextResponse.json({ error: "Moving a chapter to another series is not supported" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("chapters")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: `Failed to update chapter: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ chapter: data });
}

// DELETE /api/chapters?id=xxx — delete chapter (editor+)
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Chapter ID required" }, { status: 400 });
  }

  if (!(await canManageChapter(user.id, id))) {
    return NextResponse.json({ error: "Your role cannot remove chapters from this library" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: assets, error: assetsError } = await admin
    .from("chapter_assets")
    .select("storage_path")
    .eq("chapter_id", id);
  if (assetsError) {
    return NextResponse.json({ error: `Failed to inspect chapter assets: ${assetsError.message}` }, { status: 500 });
  }

  const paths = (assets ?? [])
    .map((asset) => asset.storage_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);
  if (paths.length > 0) {
    const { error: storageError } = await admin.storage.from("chapter-assets").remove(paths);
    if (storageError) {
      return NextResponse.json({ error: `Failed to remove chapter files: ${storageError.message}` }, { status: 500 });
    }
  }

  const { error } = await admin.from("chapters").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: `Failed to delete chapter: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
