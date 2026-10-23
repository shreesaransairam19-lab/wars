import { Suspense } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// Placeholder used only when Supabase is not configured (local UI-only dev).
const placeholderSeries = [
  {
    id: "death-note",
    title: "Death Note",
    slug: "death-note",
    description:
      "A high school student finds a supernatural notebook that kills anyone whose name is written in it.",
    content_type: "manga" as const,
    chapter_count: 12,
    avg_rating: 4.8,
    rating_count: 24,
  },
  {
    id: "orv",
    title: "Omniscient Reader's Viewpoint",
    slug: "orv",
    description:
      "A man who read a web novel finds himself living through its apocalyptic storyline.",
    content_type: "light_novel" as const,
    chapter_count: 8,
    avg_rating: 4.9,
    rating_count: 18,
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-gold" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(Math.round(rating))}
      {"☆".repeat(5 - Math.round(rating))}
    </span>
  );
}

interface LibrarySeries {
  id: string;
  title: string;
  slug: string;
  description: string;
  content_type: string;
  chapter_count: number;
  avg_rating: number;
  rating_count: number;
}

async function loadSeries(): Promise<LibrarySeries[]> {
  if (!isSupabaseConfigured()) return placeholderSeries;
  const supabase = await createClient();
  const { data } = await supabase
    .from("series")
    .select("id, title, slug, description, content_type, chapters(id), ratings(rating)")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (!data || data.length === 0) return placeholderSeries;
  return data.map((s) => {
    const ratings = (s.ratings ?? []) as { rating: number }[];
    const avg = ratings.length
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0;
    return {
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description ?? "",
      content_type: s.content_type,
      chapter_count: (s.chapters ?? []).length,
      avg_rating: Math.round(avg * 10) / 10,
      rating_count: ratings.length,
    };
  });
}

export default function LibraryPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:px-10">
        {/* Heading */}
        <div className="mb-8 rounded-[13px] border border-line bg-panel p-5">
          <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">
            Library
          </span>
          <h1 className="mt-1 font-heading text-[28px] font-semibold tracking-tight md:text-[32px]">
            Explore Manga & Light Novels
          </h1>
          <p className="mt-2 text-sm text-muted">
            Browse the collection, check ratings, and start reading.
          </p>
        </div>

        {/* Search + Sort */}
        <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden>
              🔍
            </span>
            <input
              type="search"
              placeholder="Search titles…"
              className="h-11 w-full rounded-[10px] border border-line bg-panel2 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
              aria-label="Search titles"
            />
          </div>
          <select
            className="h-11 rounded-[10px] border border-line bg-panel2 px-3 text-sm text-foreground outline-none focus:border-accent"
            aria-label="Sort by"
          >
            <option value="newest">Newest</option>
            <option value="rating">Top Rated</option>
            <option value="title">A–Z</option>
          </select>
        </div>

        {/* Genre chips */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1" role="list">
          {["All", "Manga", "Light Novel"].map((genre) => (
            <button
              key={genre}
              type="button"
              className={`shrink-0 rounded-full border px-4 py-1.5 text-[11px] font-semibold transition-colors ${
                genre === "All"
                  ? "border-[#71638c] bg-[#302a3c] text-foreground shadow-[inset_0_0_0_1px_#71638c]"
                  : "border-line bg-panel2 text-muted hover:border-[#71638c] hover:bg-[#302a3c] hover:text-foreground"
              }`}
              role="listitem"
            >
              {genre}
            </button>
          ))}
        </div>

        {/* Series grid */}
        <Suspense fallback={<div className="h-40 animate-pulse rounded-[12px] bg-panel" />}>
          <SeriesGrid />
        </Suspense>
      </main>
    </>
  );
}

async function SeriesGrid() {
  const seriesList = await loadSeries();
  return (
        <div className="grid gap-4 md:grid-cols-2">
          {seriesList.map((series) => (
            <Link
              key={series.id}
              href={`/series/${series.slug}`}
              className="group grid min-h-[160px] grid-cols-[110px_1fr] gap-4 rounded-[12px] border border-line bg-panel p-3 transition-all hover:-translate-y-0.5 hover:border-[#655b78] hover:bg-[#26242e] md:grid-cols-[120px_1fr]"
            >
              {/* Cover placeholder */}
              <div className="relative grid min-h-[140px] place-items-center overflow-hidden rounded-lg bg-[#09090b]">
                <span className="font-heading text-3xl font-bold text-purple">
                  {series.title[0]}
                </span>
                <span className="absolute bottom-1.5 right-1.5 rounded-md border border-white/15 bg-[#111116]/85 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-[#f5f2fa]">
                  {series.chapter_count} ch
                </span>
              </div>

              {/* Body */}
              <div className="flex min-w-0 flex-col gap-2 py-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-heading text-[15px] font-semibold leading-snug">
                    {series.title}
                  </h3>
                  <span className="shrink-0 text-xs font-bold text-gold">
                    {series.avg_rating}
                  </span>
                </div>

                <p className="text-[11px] leading-relaxed text-muted">
                  {series.description}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[#413d4b] bg-[#292631] px-2 py-0.5 text-[9px] text-[#c7bfd4]">
                    {series.content_type === "manga" ? "Manga" : "Light Novel"}
                  </span>
                  <Stars rating={series.avg_rating} />
                  <span className="text-[9px] text-muted">
                    ({series.rating_count})
                  </span>
                </div>

                <span className="text-[10px] font-bold text-accent">
                  Open series →
                </span>
              </div>
            </Link>
          ))}

          {/* Empty state hint */}
          {seriesList.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#3d3a46] px-6 py-12 text-center text-sm text-muted">
              No series available yet. Check back soon!
            </div>
          )}
        </div>
  );
}
