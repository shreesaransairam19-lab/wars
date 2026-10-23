import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { ArrowLeft, Star, BookOpen } from "lucide-react";
import { ReviewSection } from "@/components/series/ReviewSection";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { hasRole } from "@/lib/permissions/guards";

export function generateStaticParams() {
  return [{ slug: "death-note" }, { slug: "orv" }];
}

interface SeriesView {
  id: string;
  title: string;
  slug: string;
  description: string;
  content_type: string;
  chapters: { id: string; title: string; slug: string; number: number }[];
}

// Placeholder used only when Supabase is not configured (local UI-only dev).
const placeholder: Record<string, SeriesView> = {
  "death-note": {
    id: "placeholder-death-note",
    title: "Death Note",
    slug: "death-note",
    description:
      "A high school student finds a supernatural notebook that kills anyone whose name is written in it. A cat-and-mouse game of intellect and morality begins.",
    content_type: "manga",
    chapters: Array.from({ length: 12 }, (_, i) => ({
      id: `dn-ch-${i + 1}`,
      title: `Chapter ${i + 1}`,
      slug: `chapter-${i + 1}`,
      number: i + 1,
    })),
  },
  orv: {
    id: "placeholder-orv",
    title: "Omniscient Reader's Viewpoint",
    slug: "orv",
    description:
      "A man who read a web novel finds himself living through its apocalyptic storyline. Armed with knowledge of the plot, he must survive.",
    content_type: "light_novel",
    chapters: Array.from({ length: 8 }, (_, i) => ({
      id: `orv-ch-${i + 1}`,
      title: `Chapter ${i + 1}`,
      slug: `chapter-${i + 1}`,
      number: i + 1,
    })),
  },
};

export default function SeriesPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={
        <>
          <TopBar />
          <div className="mx-auto h-[50vh] max-w-5xl animate-pulse px-4 py-8" />
        </>
      }
    >
      <SeriesContent params={params} />
    </Suspense>
  );
}

async function SeriesContent({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let series: SeriesView | null = null;
  let canModerate = false;
  let dbId: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("series")
      .select("*, chapters(id, title, slug, chapter_number, status)")
      .eq("slug", slug)
      .maybeSingle();

    if (data) {
      dbId = data.id;
      series = {
        id: data.id,
        title: data.title,
        slug: data.slug,
        description: data.description ?? "",
        content_type: data.content_type,
        chapters: (data.chapters ?? [])
          .filter((c: { status: string }) => c.status === "published")
          .sort((a: { chapter_number: number }, b: { chapter_number: number }) => a.chapter_number - b.chapter_number)
          .map((c: { id: string; title: string | null; slug: string; chapter_number: number }) => ({
            id: c.id,
            title: c.title ?? `Chapter ${c.chapter_number}`,
            slug: c.slug,
            number: c.chapter_number,
          })),
      };

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) canModerate = await hasRole(user.id, "moderator");
    }
  }

  if (!series) series = placeholder[slug] ?? null;
  if (!series) notFound();

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 lg:px-10">
        <Link
          href="/library"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Library
        </Link>

        <div className="mb-8 grid gap-6 md:grid-cols-[180px_1fr]">
          <div className="grid min-h-[240px] place-items-center overflow-hidden rounded-xl bg-[#09090b] md:min-h-[260px]">
            <span className="font-heading text-5xl font-bold text-purple">
              {series.title[0]}
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#413d4b] bg-[#292631] px-2.5 py-1 text-[10px] font-semibold text-[#c7bfd4]">
                {series.content_type === "manga" ? "Manga" : "Light Novel"}
              </span>
            </div>

            <h1 className="mt-3 font-heading text-[28px] font-semibold tracking-tight md:text-[34px]">
              {series.title}
            </h1>

            <p className="mt-3 max-w-[600px] text-sm leading-relaxed text-muted">
              {series.description}
            </p>

            <div className="mt-auto flex flex-wrap gap-3 pt-6">
              <Link
                href={
                  series.chapters[0]
                    ? `/read/${series.slug}/${series.chapters[0].slug}`
                    : "/library"
                }
                className="inline-flex items-center gap-2 rounded-[10px] bg-accent px-5 py-2.5 text-sm font-bold text-[#171a11] transition-opacity hover:opacity-90"
              >
                <BookOpen className="h-4 w-4" />
                Start Reading
              </Link>
              <Link
                href="/support"
                className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-panel2 px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-accent"
              >
                <Star className="h-4 w-4" />
                Support
              </Link>
            </div>
          </div>
        </div>

        <section aria-labelledby="chapters-title">
          <h2 id="chapters-title" className="mb-4 font-heading text-lg font-semibold">
            Chapters ({series.chapters.length})
          </h2>
          <div className="grid gap-1.5">
            {series.chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/read/${series.slug}/${chapter.slug}`}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-lg border border-transparent bg-panel2 px-4 py-3 text-sm text-foreground transition-colors hover:border-[#514b60] hover:bg-[#2a2832]"
              >
                <span className="font-heading text-[11px] font-medium text-[#9c94b0]">
                  CH {String(chapter.number).padStart(2, "0")}
                </span>
                <span className="truncate font-heading text-[13px] font-medium">
                  {chapter.title}
                </span>
                <span className="text-[10px] text-muted">→</span>
              </Link>
            ))}
            {series.chapters.length === 0 && (
              <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-xs text-muted">
                No chapters published yet.
              </p>
            )}
          </div>
        </section>

        {dbId && <ReviewSection seriesId={dbId} canModerate={canModerate} />}
      </main>
    </>
  );
}
