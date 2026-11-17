"use client";

import { useState } from "react";
import { CatalogGrid } from "@/components/library/CatalogGrid";
import { KitsuCatalogBrowser } from "@/components/library/KitsuCatalogBrowser";
import type { CatalogSeries } from "@/lib/library/catalog";

export function AnimeLibraryTabs({ series }: { series: CatalogSeries[] }) {
  const [tab, setTab] = useState<"catalog" | "wars">("catalog");

  return (
    <>
      <div role="tablist" aria-label="Anime catalogs" className="mb-5 flex flex-wrap gap-2">
        <button type="button" role="tab" aria-selected={tab === "catalog"} onClick={() => setTab("catalog")} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === "catalog" ? "border-[#5ae2ff] bg-[#5ae2ff]/10 text-foreground" : "border-line text-muted hover:text-foreground"}`}>Full catalog</button>
        <button type="button" role="tab" aria-selected={tab === "wars"} onClick={() => setTab("wars")} className={`rounded-full border px-4 py-2 text-xs font-semibold ${tab === "wars" ? "border-[#5ae2ff] bg-[#5ae2ff]/10 text-foreground" : "border-line text-muted hover:text-foreground"}`}>WARS titles ({series.length})</button>
      </div>
      <div role="tabpanel">
        {tab === "catalog" ? <KitsuCatalogBrowser /> : <CatalogGrid series={series} kind="anime" />}
      </div>
    </>
  );
}
