import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";
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
  const admin = createAdminClient();

  // Public reader routes use the server database client just like the library
  // and series pages. Production RLS can hide published rows from the session
  // client and incorrectly turn a valid chapter link into a 404.
  const { data: series } = await admin
    .from("series")
    .select("*")
    .eq("slug", seriesSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!series) notFound();

  const { data: chapter } = await admin
    .from("chapters")
    .select("*")
    .eq("series_id", series.id)
    .eq("slug", chapterSlug)
    .eq("status", "published")
    .maybeSingle();

  if (!chapter) notFound();

  const { data: chapters } = await admin
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
  let pdfSignedUrl: string | null = null;
  {
    const { data: assets } = await admin
      .from("chapter_assets")
      .select("storage_path, mime_type")
      .eq("chapter_id", chapter.id)
      .eq("asset_type", "file")
      .order("order_index", { ascending: true });

    const files = assets ?? [];
    const pdf = files.find((asset) => asset.mime_type === "application/pdf");
    const epub = files.find((asset) => asset.mime_type === "application/epub+zip");
    const asset = series.content_type === "manga" ? pdf : epub ?? pdf;

    if (asset) {
      const signedUrl = await createSignedStorageUrl(asset.storage_path);
      if (asset.mime_type === "application/pdf") pdfSignedUrl = signedUrl;
      else epubSignedUrl = signedUrl;
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
      pdfSignedUrl={pdfSignedUrl}
    />
  );
}
