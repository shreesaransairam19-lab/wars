import Link from "next/link";
import { BookOpen, Clapperboard } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";

export default function LibraryPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">WARS Library</p>
        <h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">Choose your library</h1>
        <p className="mt-2 text-sm text-muted">Browse manga and novels separately from anime series and movies.</p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Link href="/manga" className="library-choice-card library-choice-card--manga group relative flex min-h-[300px] flex-col rounded-2xl border border-line p-6 transition-all hover:-translate-y-1 hover:border-[#655b78]">
            <video className="library-choice-card__video" autoPlay loop muted playsInline preload="metadata" poster="/library-cards/manga-library.jpg" tabIndex={-1} aria-hidden="true">
              <source src="/library-cards/manga-library.mp4" type="video/mp4" />
            </video>
            <span className="library-choice-card__scrim" aria-hidden="true" />
            <BookOpen className="relative z-10 h-8 w-8 text-purple" />
            <h2 className="relative z-10 mt-4 font-heading text-xl font-semibold">Manga Library</h2>
            <p className="relative z-10 mt-2 text-sm text-muted">Read manga and light novels from the WARS collection.</p>
            <span className="relative z-10 mt-auto inline-block pt-5 text-sm font-bold text-accent">Browse manga →</span>
          </Link>
          <Link href="/anime" className="library-choice-card library-choice-card--anime group relative flex min-h-[300px] flex-col rounded-2xl border border-line p-6 transition-all hover:-translate-y-1 hover:border-[#655b78]">
            <video className="library-choice-card__video" autoPlay loop muted playsInline preload="metadata" poster="/library-cards/anime-library.jpg" tabIndex={-1} aria-hidden="true">
              <source src="/library-cards/anime-library.mp4" type="video/mp4" />
            </video>
            <span className="library-choice-card__scrim" aria-hidden="true" />
            <Clapperboard className="relative z-10 h-8 w-8 text-[#5ae2ff]" />
            <h2 className="relative z-10 mt-4 font-heading text-xl font-semibold">Anime Library</h2>
            <p className="relative z-10 mt-2 text-sm text-muted">Explore anime series and movies, reviews, and ratings.</p>
            <span className="relative z-10 mt-auto inline-block pt-5 text-sm font-bold text-accent">Browse anime →</span>
          </Link>
        </div>
      </main>
    </>
  );
}
