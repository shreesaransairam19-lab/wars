"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { MangaReader } from "@/components/reader/MangaReader";
import { NovelReader } from "@/components/reader/NovelReader";
import { useAuth } from "@/features/auth/useAuth";

interface Asset {
  id: string;
  page_number: number | null;
  order_index: number;
  signed_url: string | null;
  mime_type: string;
  asset_type: string;
}

interface Chapter {
  id: string;
  title: string | null;
  slug: string;
  chapter_number: number;
  status: string;
  content_type?: string;
}

interface Series {
  id: string;
  title: string;
  slug: string;
  content_type: string;
}

interface ReaderPageProps {
  series: Series;
  chapter: Chapter;
  prevChapter?: Chapter | null;
  nextChapter?: Chapter | null;
  initialPosition?: number;
  initialCompleted?: boolean;
  initialCfi?: string;
  epubSignedUrl?: string | null;
  pdfSignedUrl?: string | null;
}

export function ReaderPage({
  series,
  chapter,
  prevChapter,
  nextChapter,
  initialPosition = 0,
  initialCompleted = false,
  initialCfi,
  epubSignedUrl,
  pdfSignedUrl,
}: ReaderPageProps) {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [chapterCompleted, setChapterCompleted] = useState(initialCompleted);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState("");

  useEffect(() => {
    setChapterCompleted(initialCompleted);
    setCompletionError("");
  }, [chapter.id, initialCompleted]);

  const markChapterComplete = useCallback(async () => {
    if (!user || chapterCompleted || completionSaving) return;
    setCompletionSaving(true);
    setCompletionError("");
    try {
      const response = await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapter_id: chapter.id, position: 100, completed: true }),
      });
      if (!response.ok) throw new Error("Could not save chapter completion");
      setChapterCompleted(true);
    } catch {
      setCompletionError("Could not save completion. Please try again.");
    } finally {
      setCompletionSaving(false);
    }
  }, [user, chapterCompleted, completionSaving, chapter.id]);

  // Fetch assets
  useEffect(() => {
    let cancelled = false;
    async function fetchAssets() {
      try {
        const res = await fetch(`/api/chapters/${chapter.id}/assets`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setAssets(json.assets ?? []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAssets();
    return () => {
      cancelled = true;
    };
  }, [chapter.id]);

  // Save progress
  const saveProgress = useCallback(
    async (pos: number, total: number) => {
      if (!user) return;
      await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapter.id,
          position: pos,
          completed: pos >= total - 1 && total > 0,
        }),
      });
    },
    [user, chapter.id]
  );

  const saveNovelProgress = useCallback(
    async (cfi: string, pct: number) => {
      if (!user) return;
      await fetch("/api/progress", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapter_id: chapter.id,
          position: Math.round(pct * 100),
          completed: pct >= 0.98,
        }),
      });
    },
    [user, chapter.id]
  );

  const isManga = series.content_type === "manga";

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/series/${series.slug}`}
            className="rounded-lg px-2.5 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
          >
            ← {series.title}
          </Link>
          <span className="text-sm font-semibold">
            Chapter {chapter.chapter_number}
            {chapter.title ? ` · ${chapter.title}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {prevChapter ? (
            <Link
              href={`/read/${series.slug}/${prevChapter.slug}`}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-muted/50">
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </span>
          )}
          {nextChapter ? (
            <Link
              href={`/read/${series.slug}/${nextChapter.slug}`}
              className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-[11px] text-muted/50">
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </header>

      {/* Reader */}
      <main className="flex-1">
        {loading ? (
          <div className="grid h-[60vh] place-items-center text-sm text-muted">
            Loading reader...
          </div>
        ) : pdfSignedUrl ? (
          <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col gap-2 p-3">
            <div className="flex justify-end gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={markChapterComplete}
                  disabled={chapterCompleted || completionSaving}
                  className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground disabled:cursor-default disabled:opacity-70"
                >
                  {chapterCompleted ? "Chapter completed ✓" : completionSaving ? "Saving…" : "Mark as read"}
                </button>
              ) : (
                <Link href={`/login?next=${encodeURIComponent(`/read/${series.slug}/${chapter.slug}`)}`} className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground">
                  Sign in to track reading
                </Link>
              )}
              <a
                href={pdfSignedUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
              >
                Open PDF in new tab
              </a>
            </div>
            {completionError && <p className="text-right text-xs text-[#ffb2b2]">{completionError}</p>}
            <iframe
              src={pdfSignedUrl}
              title={`${series.title} chapter ${chapter.chapter_number} PDF`}
              className="min-h-[75vh] flex-1 rounded-lg border border-line bg-white"
            />
          </div>
        ) : isManga ? (
          <MangaReader
            assets={assets}
            initialPosition={initialPosition}
            onPositionChange={(pos, total) => {
              // Debounce-ish: save every few pages? Just save on change
              saveProgress(pos, total);
            }}
          />
        ) : epubSignedUrl ? (
          <NovelReader epubUrl={epubSignedUrl} initialCfi={initialCfi} onLocationChange={saveNovelProgress} />
        ) : (
          <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-muted">
            Chapter document not available yet. Upload an EPUB or PDF in the admin panel.
          </div>
        )}
      </main>
    </div>
  );
}
