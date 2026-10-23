import Link from "next/link";
import { BookOpen, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

interface ProgressRow {
  position: number;
  completed: boolean;
  chapter_id: string;
  chapters: {
    id: string;
    title: string | null;
    slug: string;
    chapter_number: number;
    series: { id: string; title: string; slug: string; content_type: string } | null;
  } | null;
}

export async function ContinueReading() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let latest: ProgressRow | null = null;

  if (user) {
    const { data } = await supabase
      .from("reading_progress")
      .select(
        `position, completed, chapter_id,
         chapters (id, title, slug, chapter_number,
           series:series_id (id, title, slug, content_type))`
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    latest = (data as ProgressRow | null) ?? null;
  }

  const chapter = latest?.chapters ?? null;
  const series = chapter?.series ?? null;
  const readHref =
    chapter && series ? `/read/${series.slug}/${chapter.slug}` : null;

  return (
    <section className="mb-12 mt-8" aria-label="Reading activity">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="flex items-center gap-4 rounded-[17px] border border-line bg-panel p-5">
          <div className="grid h-16 w-12 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[#ce7467] to-[#313751]">
            <BookOpen className="h-7 w-7 text-[#f7f3ec]" />
          </div>
          <div className="min-w-0 flex-1">
            <small className="text-[10px] font-semibold uppercase tracking-[1.2px] text-muted">
              Continue reading
            </small>
            {readHref && series && chapter ? (
              <>
                <h3 className="mt-1 truncate font-heading text-[15px] font-semibold">
                  {series.title}
                </h3>
                <p className="truncate text-[11px] text-muted">
                  Chapter {chapter.chapter_number}
                  {chapter.title ? ` · ${chapter.title}` : ""}
                </p>
              </>
            ) : (
              <>
                <h3 className="mt-1 font-heading text-[15px] font-semibold">
                  Start reading to see progress
                </h3>
                <p className="text-[11px] text-muted">
                  Your saved chapter will appear here.
                </p>
              </>
            )}
          </div>
          <Link
            href={readHref ?? "/library"}
            className="shrink-0 rounded-[9px] bg-accent px-4 py-2.5 text-xs font-bold text-[#1a1d13] transition-opacity hover:opacity-90"
          >
            {readHref ? "Continue" : "Browse"}
          </Link>
        </div>

        <div className="flex items-center gap-4 rounded-[17px] border border-[#383441] bg-[#1e1d25] p-5">
          <Sparkles className="h-6 w-6 shrink-0 text-purple" aria-hidden />
          <div className="text-xs leading-relaxed text-muted">
            <strong className="mb-1 block font-heading text-sm font-semibold text-foreground">
              A thought for today
            </strong>
            What manga world would you visit for one day?
          </div>
        </div>
      </div>
    </section>
  );
}
