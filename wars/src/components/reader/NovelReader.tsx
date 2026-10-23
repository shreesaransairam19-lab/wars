"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, List, X } from "lucide-react";
import type { Book, Rendition } from "epubjs";

interface NavItem {
  label: string;
  href: string;
  id?: string;
  subitems?: NavItem[];
}

interface NovelReaderProps {
  epubUrl: string;
  initialCfi?: string;
  onLocationChange?: (cfi: string, percentage: number) => void;
}

const FONT_SIZES = ["90%", "100%", "115%", "130%"];
const READING_THEMES = ["dark", "sepia", "light"] as const;
type ReadingTheme = (typeof READING_THEMES)[number];

const THEME_STYLES: Record<ReadingTheme, Record<string, Record<string, string>>> = {
  dark: {
    body: { background: "#141419", color: "#e6e3ea" },
    "a, a:visited": { color: "#c6f277" },
  },
  sepia: {
    body: { background: "#f4ecd8", color: "#3a3124" },
  },
  light: {
    body: { background: "#ffffff", color: "#1a1a1a" },
  },
};

export function NovelReader({
  epubUrl,
  initialCfi,
  onLocationChange,
}: NovelReaderProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<Book | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const onLocationChangeRef = useRef(onLocationChange);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fontIndex, setFontIndex] = useState(1);
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>("dark");
  const [toc, setToc] = useState<NavItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [currentChapter, setCurrentChapter] = useState("");
  const [percentage, setPercentage] = useState(0);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    let destroyed = false;

    async function init() {
      try {
        const ePub = (await import("epubjs")).default;
        if (!viewerRef.current || destroyed) return;

        const book = ePub(epubUrl);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
          width: "100%",
          height: "100%",
          flow: "paginated",
          spread: "none",
        });
        renditionRef.current = rendition;

        for (const theme of READING_THEMES) {
          rendition.themes.register(theme, THEME_STYLES[theme]);
        }
        rendition.themes.select("dark");
        rendition.themes.fontSize(FONT_SIZES[1]);

        await book.ready;
        if (destroyed) {
          book.destroy();
          return;
        }

        const navigation = await book.loaded.navigation;
        if (destroyed) return;
        setToc(navigation.toc ?? []);

        await rendition.display(initialCfi || undefined);
        if (destroyed) return;

        rendition.on("relocated", (location: {
          start: { cfi: string; percentage?: number; href?: string };
        }) => {
          const pct = location.start.percentage ?? 0;
          setPercentage(Math.round(pct * 100));
          const href = location.start.href ?? "";
          const found = findTocByHref(navigation.toc ?? [], href);
          if (found) setCurrentChapter(found.label);
          onLocationChangeRef.current?.(location.start.cfi, pct);
        });

        setLoading(false);
      } catch (err) {
        if (!destroyed) {
          setError(err instanceof Error ? err.message : "Failed to load EPUB file");
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      destroyed = true;
      renditionRef.current?.destroy?.();
      bookRef.current?.destroy?.();
      renditionRef.current = null;
      bookRef.current = null;
    };
  }, [epubUrl, initialCfi]);

  const prev = useCallback(() => {
    void renditionRef.current?.prev();
  }, []);

  const next = useCallback(() => {
    void renditionRef.current?.next();
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [prev, next]);

  function cycleFont() {
    const nextIndex = (fontIndex + 1) % FONT_SIZES.length;
    setFontIndex(nextIndex);
    renditionRef.current?.themes?.fontSize(FONT_SIZES[nextIndex]);
  }

  function cycleReadingTheme() {
    const nextIdx = (READING_THEMES.indexOf(readingTheme) + 1) % READING_THEMES.length;
    const next = READING_THEMES[nextIdx];
    setReadingTheme(next);
    renditionRef.current?.themes?.select(next);
  }

  function goToTocItem(href: string) {
    void renditionRef.current?.display(href);
    setTocOpen(false);
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[#704044] bg-[#332329] px-6 py-12 text-center text-sm text-[#ffb2b2]">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-background/95 px-3 py-2">
        <button
          type="button"
          onClick={() => setTocOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-muted transition-colors hover:text-foreground"
          aria-expanded={tocOpen}
        >
          <List className="h-3.5 w-3.5" />
          Contents
        </button>

        <span className="min-w-0 flex-1 truncate text-center text-xs text-muted">
          {currentChapter || (loading ? "Loading..." : "")}
        </span>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold text-muted">{percentage}%</span>
          <button
            type="button"
            onClick={cycleFont}
            className="rounded-lg border border-line px-2 py-1.5 text-[10px] font-bold text-muted transition-colors hover:text-foreground"
            aria-label="Change font size"
          >
            Aa
          </button>
          <button
            type="button"
            onClick={cycleReadingTheme}
            className="rounded-lg border border-line px-2 py-1.5 text-[10px] font-semibold capitalize text-muted transition-colors hover:text-foreground"
            aria-label="Change reading theme"
          >
            {readingTheme}
          </button>
        </div>
      </div>

      <div className="relative h-[calc(100vh-190px)] bg-[#141419]">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center text-sm text-muted">
            Loading book...
          </div>
        )}
        <div ref={viewerRef} className="h-full w-full" />

        <button
          type="button"
          onClick={prev}
          className="absolute left-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur transition-colors hover:bg-black/70"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={next}
          className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white/80 backdrop-blur transition-colors hover:bg-black/70"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {tocOpen && (
        <div className="absolute inset-y-0 left-0 z-20 w-72 max-w-[85vw] overflow-y-auto border-r border-line bg-panel p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold">Contents</h3>
            <button
              type="button"
              onClick={() => setTocOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted hover:text-foreground"
              aria-label="Close contents"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <ul className="space-y-0.5">
            {toc.map((item) => (
              <li key={item.id || item.href}>
                <button
                  type="button"
                  onClick={() => goToTocItem(item.href)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted transition-colors hover:bg-panel2 hover:text-foreground"
                >
                  {item.label.trim() || "Untitled"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function findTocByHref(items: NavItem[], href: string): NavItem | null {
  for (const item of items) {
    const base = item.href.split("#")[0];
    if (base && href.includes(base)) return item;
    if (item.subitems?.length) {
      const found = findTocByHref(item.subitems, href);
      if (found) return found;
    }
  }
  return null;
}
