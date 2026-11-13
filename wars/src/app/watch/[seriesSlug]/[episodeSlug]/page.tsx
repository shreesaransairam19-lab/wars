import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSignedStorageUrl } from "@/lib/storage/signed-url";

type Params = { seriesSlug: string; episodeSlug: string };

function externalVideoEmbedUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const youtubeId = host === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(host)
        ? url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})/)?.[1]
        : null;
    if (youtubeId && /^[\w-]{11}$/.test(youtubeId)) return `https://www.youtube-nocookie.com/embed/${youtubeId}`;

    const vimeoId = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"].includes(host)
      ? url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/|$)/)?.[1]
      : null;
    if (vimeoId) return `https://player.vimeo.com/video/${vimeoId}`;
    return null;
  } catch {
    return null;
  }
}

export default function AnimeViewerPage({ params }: { params: Promise<Params> }) {
  return (
    <Suspense fallback={<><TopBar /><main className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted">Loading Anime Viewer…</main></>}>
      <AnimeEpisode params={params} />
    </Suspense>
  );
}

async function AnimeEpisode({ params }: { params: Promise<Params> }) {
  const { seriesSlug, episodeSlug } = await params;
  const admin = createAdminClient();
  const { data: series } = await admin
    .from("series")
    .select("id, title, slug, content_type")
    .eq("slug", seriesSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!series || !["anime", "anime_movie"].includes(series.content_type)) notFound();

  const { data: episode } = await admin
    .from("chapters")
    .select("id, title, slug, chapter_number")
    .eq("series_id", series.id)
    .eq("slug", episodeSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!episode) notFound();

  const { data: episodeList } = await admin
    .from("chapters")
    .select("title, slug, chapter_number")
    .eq("series_id", series.id)
    .eq("status", "published")
    .order("chapter_number", { ascending: true });
  const episodes = episodeList ?? [];
  const index = episodes.findIndex((item) => item.slug === episode.slug);
  const previous = index > 0 ? episodes[index - 1] : null;
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : null;

  const { data: videoAssets } = await admin
    .from("chapter_assets")
    .select("storage_path, mime_type, external_url")
    .eq("chapter_id", episode.id)
    .like("mime_type", "video/%")
    .order("created_at", { ascending: false });
  const video = videoAssets?.[0];
  const videoUrl = video?.external_url ?? (video ? await createSignedStorageUrl(video.storage_path) : null);
  const embedUrl = video?.external_url ? externalVideoEmbedUrl(video.external_url) : null;

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
        <Link href={`/series/${series.slug}`} className="mb-5 inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:underline">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to {series.title}
        </Link>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[1.4px] text-purple">Anime Viewer</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold">{series.title}</h1>
            <p className="mt-1 text-sm text-muted">Episode {episode.chapter_number}{episode.title ? ` · ${episode.title}` : ""}</p>
          </div>
          <div className="flex gap-2">
            {previous ? <Link href={`/watch/${series.slug}/${previous.slug}`} className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-muted hover:text-foreground"><ChevronLeft className="h-3.5 w-3.5" />Previous</Link> : null}
            {next ? <Link href={`/watch/${series.slug}/${next.slug}`} className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-muted hover:text-foreground">Next<ChevronRight className="h-3.5 w-3.5" /></Link> : null}
          </div>
        </div>
        {embedUrl ? (
          <iframe
            src={embedUrl}
            title={`${series.title}, episode ${episode.chapter_number}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            className="aspect-video w-full rounded-xl border border-line bg-black"
          />
        ) : videoUrl ? (
          <video key={videoUrl} controls playsInline preload="metadata" className="aspect-video w-full rounded-xl border border-line bg-black" aria-label={`${series.title}, episode ${episode.chapter_number}`}>
            <source src={videoUrl} type={video?.mime_type ?? "video/mp4"} />
            Your browser cannot play this video. Try opening it in another browser.
          </video>
        ) : (
          <div className="grid aspect-video place-items-center rounded-xl border border-dashed border-line bg-panel px-6 text-center">
            <div>
              <p className="font-heading text-lg font-semibold">Video not available yet</p>
              <p className="mt-2 text-sm text-muted">An Owner or Editor can upload an MP4/WebM or add a direct video, YouTube, or Vimeo link in Content Management.</p>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
