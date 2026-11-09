"use client";

import Link from "next/link";
import { Star, BookOpen, MessageCircle, Clapperboard } from "lucide-react";

const cards = [
  {
    number: "01 / READ",
    icon: BookOpen,
    color: "purple" as const,
    title: "Manga Library",
    description:
      "Browse manga and light novels, then open a title to read its chapters.",
    href: "/manga",
    backdrop: "manga",
    backgroundVideo: "/home-cards/manga-library.mp4",
    poster: "/home-cards/manga-library.jpg",
  },
  {
    number: "02 / WATCH",
    icon: Clapperboard,
    color: "lime" as const,
    title: "Anime Library",
    description:
      "Explore anime series and movies, with their own ratings and reviews.",
    href: "/anime",
    backdrop: "anime",
    backgroundVideo: "/home-cards/anime-library.mp4",
    poster: "/home-cards/anime-library.jpg",
  },
  {
    number: "03 / DISCOVER",
    icon: Star,
    color: "gold" as const,
    title: "Ratings & Reviews",
    description:
      "Compare reader ratings and share reviews for titles in either library.",
    href: "/library",
    backdrop: "reviews",
    backgroundVideo: "/home-cards/ratings-reviews.mp4",
    poster: "/home-cards/ratings-reviews.jpg",
  },
  {
    number: "04 / CONNECT",
    icon: MessageCircle,
    color: "pink" as const,
    title: "Real-Time Chat",
    description:
      "Join community rooms, share theories, and talk with other fans.",
    href: "/chat",
    backdrop: "chat",
    backgroundVideo: "/home-cards/real-time-chat.mp4",
    poster: "/home-cards/real-time-chat.jpg",
  },
];

const colorMap = {
  lime: "bg-[#29351e] text-accent",
  purple: "bg-[#2d263e] text-purple",
  pink: "bg-[#3a272c] text-pink",
  gold: "bg-[#3a3322] text-gold",
};

export function MenuCards() {
  return (
    <section aria-labelledby="menu-title">
      <div className="mb-4 mt-5 flex items-center justify-between">
        <h2 id="menu-title" className="font-heading text-[17px] font-semibold">
          Pick up where you like
        </h2>
        <span className="text-xs text-muted">Choose a space to explore ↗</span>
      </div>

      <nav
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Main menu"
      >
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={`home-menu-card home-menu-card--${card.backdrop} group relative flex min-h-[280px] flex-col rounded-[19px] border border-line p-6 transition-all hover:-translate-y-1 hover:border-[#54545e] md:min-h-[302px]`}
          >
            <video
              className="home-menu-card__video"
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster={card.poster}
              tabIndex={-1}
              aria-hidden="true"
            >
              <source src={card.backgroundVideo} type="video/mp4" />
            </video>
            <span className="home-menu-card__scrim" aria-hidden="true" />

            <div className="relative z-10 flex items-center justify-between">
              <span className="font-heading text-xs font-medium text-[#777681]">
                {card.number}
              </span>
              <div
                className={`grid h-[43px] w-[43px] place-items-center rounded-[13px] ${colorMap[card.color]}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>

            <h3 className="relative z-10 mt-6 font-heading text-[21px] font-semibold tracking-tight">
              {card.title}
            </h3>
            <p className="relative z-10 mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted">
              {card.description}
            </p>

            <span
              className="absolute bottom-6 right-6 z-10 text-xl text-[#777681] transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent"
              aria-hidden
            >
              ↗
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
