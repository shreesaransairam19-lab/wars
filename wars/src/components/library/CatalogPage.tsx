import Link from "next/link";
import { CatalogGrid } from "@/components/library/CatalogGrid";
import { TopBar } from "@/components/layout/TopBar";
import { loadCatalog } from "@/lib/library/catalog";

export async function CatalogPage({ kind }: { kind: "manga" | "anime" }) {
  const isAnime = kind === "anime";
  const series = await loadCatalog(isAnime ? ["anime", "anime_movie"] : ["manga", "light_novel"]);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 lg:px-10">
        <div className="mb-7 rounded-2xl border border-line bg-panel p-5 md:p-7">
          <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">WARS Library</p>
          <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">{isAnime ? "Anime Library" : "Manga Library"}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">{isAnime ? "Discover anime series and movies. Open a title to see its details, reviews, and ratings." : "Browse manga and light novels, then open a title to read chapters and share a review."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/manga" aria-current={!isAnime ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${!isAnime ? "border-purple bg-purple/15 text-foreground" : "border-line text-muted hover:text-foreground"}`}>Manga Library</Link>
            <Link href="/anime" aria-current={isAnime ? "page" : undefined} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${isAnime ? "border-[#5ae2ff] bg-[#5ae2ff]/10 text-foreground" : "border-line text-muted hover:text-foreground"}`}>Anime Library</Link>
          </div>
        </div>
        <CatalogGrid series={series} kind={kind} />
      </main>
    </>
  );
}
