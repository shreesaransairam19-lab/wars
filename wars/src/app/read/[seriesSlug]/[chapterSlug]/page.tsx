import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReaderPage } from "@/components/reader/ReaderPage";

type Params = { seriesSlug: string; chapterSlug: string };

export default function ReadChapterPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense
      fallback={
        <div className="grid h-[60vh] place-items-center text-sm text-muted">
          Loading reader...
        </div>
      }
    >
      <ChapterReader params={params} />
    </Suspense>
  );
}

async function ChapterReader({ params }: { params: Promise<Params> }) {
  const { seriesSlug, chapterSlug } = await params;
  const supabase = await createClient();

  const { data: series } = await supabase
    .from("series")
    .select("*")
    .eq("slug", seriesSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!series) notFound();

  const { data: chapter } = await supabase
    .from("chapters")
    .select("*")
    .eq("series_id", series.id)
    .eq("slug", chapterSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!chapter) notFound();

  const { data: chapters } = await supabase
    .from("chapters")
    .select("id, title, slug, chapter_number, status")
    .eq("series_id", series.id)
    .eq("status", "published")
    .order("chapter_number", { ascending: true });

  const chapterList = chapters ?? [];
  const currentIndex = chapterList.findIndex((c) => c.id === chapter.id);
  const prevChapter = currentIndex > 0 ? chapterList[currentIndex - 1] : null;
  const nextChapter =
    currentIndex < chapterList.length - 1 ? chapterList[currentIndex + 1] : null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let initialPosition = 0;

  if (user) {
    const { data: progress } = await supabase
      .from("reading_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("chapter_id", chapter.id)
      .maybeSingle();

    if (progress && series.content_type === "manga") {
      initialPosition = Number(progress.position) || 0;
    }
  }

  let epubSignedUrl: string | null = null;
  if (series.content_type !== "manga") {
    const { data: asset } = await supabase
      .from("chapter_assets")
      .select("*")
      .eq("chapter_id", chapter.id)
      .eq("asset_type", "file")
      .maybeSingle();

    if (asset) {
      const slashIndex = asset.storage_path.indexOf("/");
      const bucket = asset.storage_path.slice(0, slashIndex);
      const path = asset.storage_path.slice(slashIndex + 1);
      const { data: signed } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600);
      epubSignedUrl = signed?.signedUrl ?? null;
    }
  }

  return (
    <ReaderPage
      series={series}
      chapter={chapter}
      prevChapter={prevChapter}
      nextChapter={nextChapter}
      initialPosition={initialPosition}
      epubSignedUrl={epubSignedUrl}
    />
  );
}
