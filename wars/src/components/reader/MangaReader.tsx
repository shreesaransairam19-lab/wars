"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns,
  Rows,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface ReaderAsset {
  id: string;
  page_number: number | null;
  order_index: number;
  signed_url: string | null;
  mime_type: string;
}

interface MangaReaderProps {
  assets: ReaderAsset[];
  initialPosition?: number;
  onPositionChange?: (position: number, total: number) => void;
}

type ViewMode = "vertical" | "horizontal";

export function MangaReader({
  assets,
  initialPosition = 0,
  onPositionChange,
}: MangaReaderProps) {
  const [mode, setMode] = useState<ViewMode>("vertical");
  const [currentPage, setCurrentPage] = useState(initialPosition);
  const [immersive, setImmersive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const totalPages = assets.length;

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(0, Math.min(page, totalPages - 1));
      setCurrentPage(clamped);
      onPositionChange?.(clamped, totalPages);

      if (mode === "vertical") {
        pageRefs.current[clamped]?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [totalPages, mode, onPositionChange]
  );

  // Keyboard navigation (horizontal mode)
  useEffect(() => {
    if (mode !== "horizontal") return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goToPage(currentPage + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPage(currentPage - 1);
      } else if (e.key === "f") {
        setImmersive((v) => !v);
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mode, currentPage, goToPage]);

  // Track visible page in vertical mode via IntersectionObserver
  useEffect(() => {
    if (mode !== "vertical") return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number(entry.target.getAttribute("data-index"));
            if (!Number.isNaN(index)) {
              setCurrentPage(index);
              onPositionChange?.(index, totalPages);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [mode, totalPages, onPositionChange]);

  if (totalPages === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[#3d3a46] px-6 py-16 text-center text-sm text-muted">
        No pages uploaded for this chapter yet.
      </div>
    );
  }

  return (
    <div className={immersive ? "fixed inset-0 z-50 bg-black" : "relative"}>
      {/* Toolbar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-background/95 px-3 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode("vertical")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              mode === "vertical"
                ? "bg-accent text-[#171a11]"
                : "border border-line text-muted hover:text-foreground"
            }`}
            aria-pressed={mode === "vertical"}
          >
            <Rows className="h-3.5 w-3.5" />
            Scroll
          </button>
          <button
            type="button"
            onClick={() => setMode("horizontal")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              mode === "horizontal"
                ? "bg-accent text-[#171a11]"
                : "border border-line text-muted hover:text-foreground"
            }`}
            aria-pressed={mode === "horizontal"}
          >
            <Columns className="h-3.5 w-3.5" />
            Page
          </button>
        </div>

        <span className="text-xs font-semibold text-muted" aria-live="polite">
          {currentPage + 1} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => setImmersive((v) => !v)}
          className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted transition-colors hover:text-foreground"
          aria-label={immersive ? "Exit fullscreen" : "Fullscreen"}
        >
          {immersive ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Vertical scroll */}
      {mode === "vertical" && (
        <div
          ref={containerRef}
          className="mx-auto flex max-w-3xl flex-col gap-1 px-1 py-2"
        >
          {assets.map((asset, index) => (
            <div
              key={asset.id}
              ref={(el) => {
                pageRefs.current[index] = el;
              }}
              data-index={index}
              className="overflow-hidden rounded-sm bg-[#101014]"
            >
              {asset.signed_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={asset.signed_url}
                  alt={`Page ${index + 1}`}
                  loading={index < 3 ? "eager" : "lazy"}
                  className="mx-auto block w-full max-w-full"
                />
              ) : (
                <div className="grid h-64 place-items-center text-xs text-muted">
                  Page {index + 1} unavailable
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Horizontal flip */}
      {mode === "horizontal" && (
        <div className="flex flex-col">
          <div className="relative flex h-[calc(100vh-120px)] items-center justify-center bg-black p-2">
            {assets[currentPage]?.signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={assets[currentPage].signed_url}
                alt={`Page ${currentPage + 1}`}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-sm text-muted">
                Page {currentPage + 1} unavailable
              </div>
            )}

            {/* Nav arrows */}
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="absolute left-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages - 1}
              className="absolute right-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/60 text-white backdrop-blur transition-colors hover:bg-black/80 disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Page slider */}
          <div className="flex items-center gap-3 px-4 py-3">
            <input
              type="range"
              min={0}
              max={totalPages - 1}
              value={currentPage}
              onChange={(e) => goToPage(parseInt(e.target.value, 10))}
              className="flex-1 accent-[#c6f277]"
              aria-label="Page slider"
            />
          </div>
        </div>
      )}
    </div>
  );
}
