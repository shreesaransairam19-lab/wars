import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const progressSchema = z.object({
  chapter_id: z.string().uuid(),
  position: z.number().min(0),
  completed: z.boolean().optional(),
});

// GET /api/progress?chapter_id=xxx — get progress for a chapter
// GET /api/progress — get all progress (for continue reading)
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const chapterId = url.searchParams.get("chapter_id");

  if (chapterId) {
    const { data, error } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
    }
    return NextResponse.json({ progress: data });
  }

  // Latest progress with chapter + series info (for continue reading)
  const { data, error } = await supabase
    .from("reading_progress")
    .select(
      `
      *,
      chapters (
        id, title, slug, chapter_number,
        series:series_id (id, title, slug, content_type)
      )
    `
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(5);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
}

// PUT /api/progress — upsert reading progress
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = progressSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const updatedAt = new Date().toISOString();
  let error: { code?: string } | null = null;

  if (parsed.data.completed === true) {
    const result = await supabase.from("reading_progress").upsert(
      {
        user_id: user.id,
        chapter_id: parsed.data.chapter_id,
        position: parsed.data.position,
        completed: true,
        updated_at: updatedAt,
      },
      { onConflict: "user_id,chapter_id" }
    );
    error = result.error;
  } else {
    // Update position without clearing a completion the reader has already
    // earned by returning to or rereading the chapter.
    const updated = await supabase
      .from("reading_progress")
      .update({ position: parsed.data.position, updated_at: updatedAt })
      .eq("user_id", user.id)
      .eq("chapter_id", parsed.data.chapter_id)
      .select("chapter_id")
      .maybeSingle();

    if (updated.error) {
      error = updated.error;
    } else if (!updated.data) {
      const inserted = await supabase.from("reading_progress").insert({
        user_id: user.id,
        chapter_id: parsed.data.chapter_id,
        position: parsed.data.position,
        completed: false,
        updated_at: updatedAt,
      });

      // Another tab can create the row between our update and insert. In that
      // case, retry as a position-only update to preserve completed=true.
      if (inserted.error?.code === "23505") {
        const retry = await supabase
          .from("reading_progress")
          .update({ position: parsed.data.position, updated_at: updatedAt })
          .eq("user_id", user.id)
          .eq("chapter_id", parsed.data.chapter_id);
        error = retry.error;
      } else {
        error = inserted.error;
      }
    }
  }

  if (error) {
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
