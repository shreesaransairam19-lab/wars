"use client";

import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { getPrimaryRole } from "@/components/auth/RoleName";
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
  chatMessages: number;
}

export default function DashboardPage() {
  const { user, profile, roles, loading } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [statsAttempt, setStatsAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setStats(null);
      setStatsLoading(true);
      setStatsError(false);
      try {
        const res = await fetch("/api/user/stats", { cache: "no-store" });
        if (!res.ok) throw new Error("Stats request failed");
        const json = (await res.json()) as Stats;
        if (!cancelled) setStats(json);
      } catch {
        if (!cancelled) {
          setStats(null);
          setStatsError(true);
        }
      } finally {
        if (!cancelled) setStatsLoading(false);
      }
    }
    if (user) void load();
    return () => {
      cancelled = true;
    };
  }, [user, statsAttempt]);

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
  const primaryRole = getPrimaryRole(roles);
  const level = stats?.level;
  const rank = stats?.rank;

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <ProfileAvatar userId={user.id} avatarPath={profile?.avatar_path} name={displayName} role={primaryRole} frameId={profile?.equipped_frame_id} size={64} />
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {displayName}
            </h1>
            <p className="text-sm text-muted">@{profile?.username}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {roles.map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>
          </div>
        </div>

        {statsError && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#704044] bg-[#332329] px-4 py-3 text-sm text-[#ffb2b2]">
            <span>Your dashboard stats could not be loaded. No totals are being shown as zero.</span>
            <button
              type="button"
              onClick={() => setStatsAttempt((attempt) => attempt + 1)}
              className="rounded-lg border border-[#a65b64] px-3 py-1.5 font-semibold hover:bg-[#4a2d33]"
            >
              Retry
            </button>
          </div>
        )}

        {/* XP / Level card */}
        <div className="mb-6 rounded-[17px] border border-line bg-panel p-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-accent">
                {level !== undefined ? `Level ${level}` : statsLoading ? "Loading stats…" : "Stats unavailable"}
              </span>
              <h2 className="mt-1 font-heading text-xl font-semibold">
                {rank ?? "—"}
              </h2>
            </div>
            <Trophy className="h-8 w-8 text-gold" />
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#38383f]">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.max(0, Math.min(1, stats?.progress ?? 0)) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted">
            {stats
              ? stats.level >= 100
                ? `Level cap reached · ${stats.totalXp} total XP`
                : `${stats.currentLevelXp} / ${stats.nextLevelXp} XP to next level · ${stats.totalXp} total XP`
              : statsLoading
                ? "Loading reading and activity totals…"
                : "Stats are currently unavailable."}
          </p>
        </div>

                {/* Quick stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            {
              icon: BookOpen,
              label: "Chapters Read",
              value: stats ? String(stats.chaptersRead) : statsLoading ? "…" : "—",
              href: "/library",
            },
            {
              icon: Star,
              label: "Reviews Posted",
              value: stats ? String(stats.reviewsPosted) : statsLoading ? "…" : "—",
              href: "/library",
            },
            {
              icon: MessageCircle,
              label: "Room Messages",
              value: stats ? String(stats.chatMessages) : statsLoading ? "…" : "—",
              href: "/chat",
            },
            {
              icon: Trophy,
              label: "Total XP",
              value: stats ? String(stats.totalXp) : statsLoading ? "…" : "—",
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
