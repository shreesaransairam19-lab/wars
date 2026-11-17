"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ExternalLink, Search } from "lucide-react";

interface KitsuTitle {
  id: string;
  title: string;
  alternateTitle: string;
  synopsis: string;
  posterUrl: string | null;
  subtype: string;
  status: string;
  startYear: string;
  episodeCount: number | null;
  ageRating: string;
  averageRating: number | null;
  sourceUrl: string;
}

interface CatalogResponse {
  results: KitsuTitle[];
  total: number | null;
  hasMore: boolean;
}

export function KitsuCatalogBrowser() {
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ offset: String(offset) });
    if (query) params.set("q", query);

    fetch(`/api/catalog/kitsu?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "Could not load catalog.");
        return result as CatalogResponse;
      })
      .then(setData)
      .catch((caught) => {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Could not load catalog.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [query, offset]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = searchInput.trim().replace(/\s+/g, " ");
    setOffset(0);
    setQuery(nextQuery);
  }

  return (
    <section aria-label="Kitsu anime catalog">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Full anime catalog</h2>
          <p className="mt-1 text-xs text-muted">Browse and search titles from Kitsu. Video links are managed separately in WARS.</p>
        </div>
        {data?.total !== null && data?.total !== undefined && (
          <span className="text-xs text-muted">{data.total.toLocaleString()} catalog titles</span>
        )}
      </div>

      <form onSubmit={submitSearch} className="mb-5 flex gap-2">
        <label htmlFor="kitsu-anime-search" className="sr-only">Search Kitsu anime</label>
        <input
          id="kitsu-anime-search"
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search the full anime catalog…"
          className="h-11 min-w-0 flex-1 rounded-[10px] border border-line bg-panel2 px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent"
        />
        <button type="submit" className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-accent px-4 text-sm font-bold text-[#171a11]">
          <Search className="h-4 w-4" /> Search
        </button>
      </form>

      {error && <p role="alert" className="mb-4 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((item) => <div key={item} className="h-72 animate-pulse rounded-xl border border-line bg-panel" />)}
        </div>
      ) : data?.results.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.results.map((item) => (
            <article key={item.id} className="overflow-hidden rounded-xl border border-line bg-panel">
              <div className="flex min-h-48 gap-4 p-4">
                <div className="h-44 w-32 shrink-0 overflow-hidden rounded-lg bg-[#09090b]">
                  {item.posterUrl ? (
                    <img src={item.posterUrl} alt={`${item.title} poster`} loading="lazy" className="h-full w-full object-cover" />
                  ) : <div className="grid h-full place-items-center font-heading text-4xl font-bold text-purple">{item.title.slice(0, 1)}</div>}
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-sm font-semibold leading-snug">{item.title}</h3>
                  {item.alternateTitle && item.alternateTitle !== item.title && <p className="mt-1 line-clamp-1 text-[10px] text-muted">{item.alternateTitle}</p>}
                  <p className="mt-2 text-[10px] capitalize text-[#5ae2ff]">{[item.subtype, item.startYear, item.status.replaceAll("_", " ")].filter(Boolean).join(" · ")}</p>
                  {item.episodeCount !== null && <p className="mt-1 text-[10px] text-muted">{item.episodeCount} episodes</p>}
                  {item.ageRating && <p className="mt-1 text-[10px] text-muted">Rated {item.ageRating}</p>}
                  {item.averageRating !== null && <p className="mt-1 text-[10px] text-gold">★ {item.averageRating.toFixed(1)} Kitsu rating</p>}
                </div>
              </div>
              <p className="line-clamp-4 min-h-[4.5rem] px-4 pb-3 text-xs leading-relaxed text-muted">{item.synopsis || "No synopsis available."}</p>
              <div className="border-t border-line px-4 py-3">
                <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
                  View source on Kitsu <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">{query ? "No anime matched that search." : "No catalog titles are available right now."}</div>
      )}

      <div className="mt-5 flex items-center justify-between gap-4">
        <button type="button" disabled={offset === 0 || loading} onClick={() => setOffset((current) => Math.max(0, current - 20))} className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-40">Previous</button>
        <span className="text-[10px] text-muted">Showing {offset + 1}–{offset + (data?.results.length ?? 0)}</span>
        <button type="button" disabled={!data?.hasMore || loading} onClick={() => setOffset((current) => current + 20)} className="rounded-lg border border-line px-4 py-2 text-xs font-semibold text-foreground disabled:opacity-40">Next</button>
      </div>
      <p className="mt-4 text-center text-[10px] text-muted">Catalog metadata provided by <a href="https://kitsu.io" target="_blank" rel="noopener noreferrer" className="underline">Kitsu</a>. WARS reviews and playback apply to WARS titles.</p>
    </section>
  );
}
