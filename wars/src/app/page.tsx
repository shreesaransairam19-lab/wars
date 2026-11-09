import { Suspense } from "react";
import { TopBar } from "@/components/layout/TopBar";
import { HeroSection } from "@/components/home/HeroSection";
import { MenuCards } from "@/components/home/MenuCards";
import { ContinueReading } from "@/components/home/ContinueReading";
import { FeedbackPanel } from "@/components/home/FeedbackPanel";

export default function HomePage() {
  return (
    <>
      <div className="home-page-background" aria-hidden="true">
        <video
          className="home-page-background__video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/home-cards/home-screen-background.jpg"
          tabIndex={-1}
        >
          <source src="/home-cards/home-screen-background.mp4" type="video/mp4" />
        </video>
        <span className="home-page-background__scrim" />
      </div>
      <TopBar />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-10">
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
