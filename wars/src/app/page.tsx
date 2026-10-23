import { Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { HeroSection } from "@/components/home/HeroSection";
import { MenuCards } from "@/components/home/MenuCards";
import { ContinueReading } from "@/components/home/ContinueReading";
import { FeedbackPanel } from "@/components/home/FeedbackPanel";

export default function HomePage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-10">
        <HeroSection />
        <MenuCards />
        <Suspense
          fallback={
            <div className="mb-12 mt-8 h-[104px] animate-pulse rounded-[17px] border border-line bg-panel" />
          }
        >
          <ContinueReading />
        </Suspense>
        <FeedbackPanel />
      </main>
    </>
  );
}
