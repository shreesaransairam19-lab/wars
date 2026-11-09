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
          <Link href="/manga" className="group rounded-2xl border border-line bg-panel p-6 transition-colors hover:border-[#655b78]">
            <BookOpen className="h-8 w-8 text-purple" />
            <h2 className="mt-4 font-heading text-xl font-semibold">Manga Library</h2>
            <p className="mt-2 text-sm text-muted">Read manga and light novels from the WARS collection.</p>
            <span className="mt-5 inline-block text-sm font-bold text-accent">Browse manga →</span>
          </Link>
          <Link href="/anime" className="group rounded-2xl border border-line bg-panel p-6 transition-colors hover:border-[#655b78]">
            <Clapperboard className="h-8 w-8 text-[#5ae2ff]" />
            <h2 className="mt-4 font-heading text-xl font-semibold">Anime Library</h2>
            <p className="mt-2 text-sm text-muted">Explore anime series and movies, reviews, and ratings.</p>
            <span className="mt-5 inline-block text-sm font-bold text-accent">Browse anime →</span>
          </Link>
        </div>
      </main>
    </>
  );
}
