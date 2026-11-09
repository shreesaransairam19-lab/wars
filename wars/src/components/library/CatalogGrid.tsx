"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CatalogSeries } from "@/lib/library/catalog";

function mediaLabel(type: string) {
  switch (type) {
    case "anime": return "Anime Series";
    case "anime_movie": return "Anime Movie";
    case "light_novel": return "Light Novel";
    default: return "Manga";
  }
}

export function CatalogGrid({ series, kind }: { series: CatalogSeries[]; kind: "manga" | "anime" }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("newest");
  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    const filtered = series.filter((item) => !search || `${item.title} ${item.description}`.toLowerCase().includes(search));
    if (sort === "rating") return [...filtered].sort((a, b) => b.avg_rating - a.avg_rating || b.rating_count - a.rating_count);
    if (sort === "title") return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    return filtered;
  }, [query, series, sort]);

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${kind === "anime" ? "anime" : "manga"}…`} aria-label="Search titles" className="h-11 w-full rounded-[10px] border border-line bg-panel2 px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent" />
        <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort titles" className="h-11 rounded-[10px] border border-line bg-panel2 px-3 text-sm text-foreground outline-none focus:border-accent">
          <option value="newest">Recently added</option>
          <option value="rating">Top rated</option>
          <option value="title">A–Z</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item) => (
          <Link key={item.id} href={`/series/${item.slug}`} className="group overflow-hidden rounded-xl border border-line bg-panel transition-colors hover:border-[#655b78]">
            <div className="relative h-56 overflow-hidden bg-[#09090b]">
              {item.cover_url ? <img src={item.cover_url} alt={`${item.title} cover`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="grid h-full place-items-center font-heading text-5xl font-bold text-purple">{item.title.slice(0, 1)}</div>}
              <span className="absolute left-3 top-3 rounded-full border border-white/15 bg-[#111116]/85 px-2.5 py-1 text-[10px] font-semibold text-white">{mediaLabel(item.content_type)}</span>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-heading text-base font-semibold leading-snug">{item.title}</h2>
                <span className="shrink-0 text-xs font-bold text-gold">★ {item.avg_rating.toFixed(1)}</span>
              </div>
              <p className="mt-2 line-clamp-3 min-h-12 text-xs leading-relaxed text-muted">{item.description || "No description added yet."}</p>
              <div className="mt-4 flex items-center justify-between text-[10px] text-muted">
                <span>{item.content_type.startsWith("anime") ? (item.chapter_count ? `${item.chapter_count} episodes` : "Series details") : `${item.chapter_count} chapters`}</span>
                <span>{item.rating_count} ratings</span>
              </div>
              <span className="mt-3 inline-block text-xs font-bold text-accent">View details →</span>
            </div>
          </Link>
        ))}
        {visible.length === 0 && <div className="col-span-full rounded-xl border border-dashed border-line px-6 py-14 text-center text-sm text-muted">{series.length ? "No titles match your search." : `No ${kind === "anime" ? "anime" : "manga"} titles yet. Staff can add titles through Content Management.`}</div>}
      </div>
    </>
  );
}
