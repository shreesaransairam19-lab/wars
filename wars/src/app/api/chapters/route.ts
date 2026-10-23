import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { chapterSchema } from "@/lib/validation/series";
import { hasRole } from "@/lib/permissions/guards";
import { checkRateLimit, RATE_LIMITS, getClientIp } from "@/lib/security/rate-limit";

// GET /api/chapters?series_id=xxx — list chapters for a series
export async function GET(request: Request) {
  const supabase = await createClient();
  const url = new URL(request.url);
  const seriesId = url.searchParams.get("series_id");

  if (!seriesId) {
    return NextResponse.json({ error: "series_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chapters")
    .select("*, chapter_assets(count)")
    .eq("series_id", seriesId)
    .order("chapter_number", { ascending: true });

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

  const canEdit = await hasRole(user.id, "editor");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const { data, error } = await supabase
    .from("chapters")
    .insert(parsed.data)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Chapter slug already exists in this series" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create chapter" }, { status: 500 });
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

  const canEdit = await hasRole(user.id, "editor");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

  const { data, error } = await supabase
    .from("chapters")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update chapter" }, { status: 500 });
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

  const canEdit = await hasRole(user.id, "editor");
  if (!canEdit) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Chapter ID required" }, { status: 400 });
  }

  const { error } = await supabase.from("chapters").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Failed to delete chapter" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
