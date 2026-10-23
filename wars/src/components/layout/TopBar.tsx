"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Bell, Menu, X } from "lucide-react";
import { UserMenu } from "@/features/auth/UserMenu";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/library", label: "Library" },
  { href: "/chat", label: "Chat" },
  { href: "/dashboard", label: "Dashboard" },
];

export function TopBar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMenu = useCallback(() => setMobileOpen(false), []);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-[82px] md:px-6 lg:px-10">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-3" aria-label="WARS home">
          <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-accent text-xl text-[#171a11] md:h-9 md:w-9">
            W
          </div>
          <div className="flex flex-col gap-px">
            <strong className="font-heading text-lg leading-none tracking-tight md:text-xl">
              WARS
            </strong>
            <small className="text-[8px] font-semibold uppercase tracking-wider text-muted md:text-[9px]">
              World Anime Review System
            </small>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-muted transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            type="button"
            className="relative hidden h-9 w-9 place-items-center rounded-[10px] border border-line bg-panel2 text-sm md:grid"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4 text-muted" />
          </button>

          <UserMenu />

          <ThemeToggle />

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-[9px] border border-line bg-panel2 md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav
          className="border-t border-line bg-panel px-4 py-3 md:hidden"
          aria-label="Mobile navigation"
        >
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm text-muted transition-colors hover:bg-panel2 hover:text-foreground"
                onClick={closeMenu}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
