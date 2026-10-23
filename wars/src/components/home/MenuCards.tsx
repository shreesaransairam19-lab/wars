"use client";

import Link from "next/link";
import { Star, BookOpen, MessageCircle, Compass } from "lucide-react";

const cards = [
  {
    number: "01 / DISCOVER",
    icon: Star,
    color: "lime" as const,
    title: "Rating & Review",
    description:
      "Search added chapters, then rate and review the exact manga episode.",
    href: "/library",
  },
  {
    number: "02 / EXPLORE",
    icon: BookOpen,
    color: "purple" as const,
    title: "Explore Manga",
    description:
      "Search titles by genre, check reader ratings, and open chapter guides.",
    href: "/library",
  },
  {
    number: "03 / CONNECT",
    icon: MessageCircle,
    color: "pink" as const,
    title: "Real-Time Chat",
    description:
      "Join anime servers, share theories, and talk with fans in dedicated rooms.",
    href: "/chat",
  },
  {
    number: "04 / RECOMMENDED",
    icon: Compass,
    color: "gold" as const,
    title: "Recommended Manga",
    description: "Find reader favorites ranked by episode star ratings.",
    href: "/library",
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
            className="group relative flex min-h-[280px] flex-col rounded-[19px] border border-line bg-panel p-6 transition-all hover:-translate-y-1 hover:border-[#54545e] hover:bg-[#1e1e26] md:min-h-[302px]"
          >
            <div className="flex items-center justify-between">
              <span className="font-heading text-xs font-medium text-[#777681]">
                {card.number}
              </span>
              <div
                className={`grid h-[43px] w-[43px] place-items-center rounded-[13px] ${colorMap[card.color]}`}
              >
                <card.icon className="h-5 w-5" />
              </div>
            </div>

            <h3 className="mt-6 font-heading text-[21px] font-semibold tracking-tight">
              {card.title}
            </h3>
            <p className="mt-2 max-w-[280px] text-[13px] leading-relaxed text-muted">
              {card.description}
            </p>

            <span
              className="absolute bottom-6 right-6 text-xl text-[#777681] transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-accent"
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
