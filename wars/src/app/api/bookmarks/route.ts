import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bookmarkSchema = z.object({
  series_id: z.string().uuid(),
  chapter_id: z.string().uuid().optional(),
});

// GET /api/bookmarks — list user's bookmarks
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      `
      *,
      series (id, title, slug, content_type, cover_path),
      chapters (id, title, slug, chapter_number)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch bookmarks" }, { status: 500 });
  }

  return NextResponse.json({ bookmarks: data });
}

// POST /api/bookmarks — add bookmark
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bookmarkSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { error } = await supabase.from("bookmarks").upsert(
    {
      user_id: user.id,
      series_id: parsed.data.series_id,
      chapter_id: parsed.data.chapter_id ?? null,
    },
    { onConflict: "user_id,series_id,chapter_id" }
  );

  if (error) {
    return NextResponse.json({ error: "Failed to add bookmark" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE /api/bookmarks?series_id=xxx&chapter_id=yyy — remove bookmark
export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const seriesId = url.searchParams.get("series_id");
  const chapterId = url.searchParams.get("chapter_id");

  if (!seriesId) {
    return NextResponse.json({ error: "series_id required" }, { status: 400 });
  }

  let query = supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("series_id", seriesId);

  if (chapterId) {
    query = query.eq("chapter_id", chapterId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: "Failed to remove bookmark" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
