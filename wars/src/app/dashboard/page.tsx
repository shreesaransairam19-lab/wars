"use client";

import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/features/auth/useAuth";
import { BookOpen, Star, MessageCircle, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

interface Stats {
  totalXp: number;
  level: number;
  rank: string;
  progress: number;
  currentLevelXp: number;
  nextLevelXp: number;
  chaptersRead: number;
  reviewsPosted: number;
}

export default function DashboardPage() {
  const { user, profile, roles, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/user/stats");
      if (!res.ok) return;
      const json = await res.json();
      if (!cancelled) setStats(json);
    }
    if (user) void load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-5xl px-4 py-16 md:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 rounded bg-panel2" />
            <div className="h-4 w-48 rounded bg-panel2" />
          </div>
        </main>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <TopBar />
        <main className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="font-heading text-2xl font-semibold">
            Sign in to view your dashboard
          </h1>
          <p className="mt-2 text-sm text-muted">
            Track your reading progress, XP, and more.
          </p>
          <Link
            href="/login?next=/dashboard"
            className="mt-6 inline-block rounded-[10px] bg-accent px-6 py-3 text-sm font-bold text-[#171a11]"
          >
            Sign In
          </Link>
        </main>
      </>
    );
  }

  const displayName =
    profile?.display_name || profile?.username || "Reader";
  const level = stats?.level ?? 1;
  const rank = stats?.rank ?? "Rookie";
  const progress = stats?.progress ?? 0;
  const currentLevelXp = stats?.currentLevelXp ?? 0;
  const nextLevelXp = stats?.nextLevelXp ?? 100;

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-[#664d83] text-xl font-bold text-white">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <p className="text-sm text-muted">@{profile?.username}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <span
                  key={role}
                  className="rounded-full border border-[#514f5b] bg-[#302f38] px-2 py-0.5 text-[9px] font-bold text-[#d1ced8]"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* XP / Level card */}
        <div className="mb-6 rounded-[17px] border border-line bg-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-accent">
                Level {level}
              </span>
              <h2 className="mt-1 font-heading text-xl font-semibold">
                {rank}
              </h2>
            </div>
            <Trophy className="h-8 w-8 text-gold" />
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#38383f]">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            {currentLevelXp} / {nextLevelXp} XP to next level
            {stats?.totalXp !== undefined && ` · ${stats.totalXp} total XP`}
          </p>
        </div>

                {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              icon: BookOpen,
              label: "Chapters Read",
              value: String(stats?.chaptersRead ?? 0),
              href: "/library",
            },
            {
              icon: Star,
              label: "Reviews Posted",
              value: String(stats?.reviewsPosted ?? 0),
              href: "/series/death-note",
            },
            {
              icon: MessageCircle,
              label: "Chat",
              value: "—",
              href: "/chat",
            },
            {
              icon: Trophy,
              label: "Total XP",
              value: String(stats?.totalXp ?? 0),
              href: "/dashboard",
            },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="flex items-center gap-3 rounded-[14px] border border-line bg-panel p-4 transition-colors hover:border-[#514b60]"
              >
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#2a2933]">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{stat.value}</p>
                  <p className="text-[11px] text-muted">{stat.label}</p>
                </div>
              </Link>
            );
          })}
        </div>

{/* Bio */}
        {profile?.bio && (
          <div className="mt-6 rounded-[14px] border border-line bg-panel p-5">
            <h3 className="font-heading text-sm font-semibold">About</h3>
            <p className="mt-2 text-sm text-muted">{profile.bio}</p>
          </div>
        )}
      </main>
    </>
  );
}
