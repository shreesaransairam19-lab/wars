"use client";

import Link from "next/link";
import { BookOpen, Clapperboard, CreditCard, MessageSquare, Users } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/features/auth/useAuth";

const cardClass = "group rounded-xl border border-line bg-panel p-5 transition-colors hover:border-accent/60 hover:bg-panel2";

export default function AdminPage() {
  const { user, roles, loading } = useAuth();
  const canManageManga = roles.some((role) => ["owner", "codester", "editor", "manga_editor"].includes(role));
  const canManageAnime = roles.some((role) => ["owner", "codester", "editor", "anime_editor"].includes(role));
  const canManageMembers = roles.some((role) => ["owner", "codester"].includes(role));
  const canModerate = roles.some((role) => ["owner", "codester", "admin", "moderator"].includes(role));
  const canReviewPayments = roles.some((role) => ["owner", "codester", "admin"].includes(role));
  const hasAdminSections = canManageManga || canManageAnime || canManageMembers || canModerate || canReviewPayments;

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">WARS Control Center</p>
        <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">Admin sections</h1>
        <p className="mt-1 text-sm text-muted">Each team task has its own section and permissions.</p>

        {loading ? (
          <div className="mt-6 h-48 animate-pulse rounded-xl bg-panel2" />
        ) : !user || !hasAdminSections ? (
          <div className="mt-6 rounded-xl border border-line bg-panel p-6 text-center">
            <h2 className="font-heading text-lg font-semibold">Staff access required</h2>
            <p className="mt-2 text-sm text-muted">Sign in with an assigned WARS staff role to open the control center.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {canManageManga && <Link className={cardClass} href="/admin/content?library=manga">
              <BookOpen className="h-5 w-5 text-orange-300" />
              <h2 className="mt-4 font-heading text-base font-semibold">Manga &amp; Light Novels</h2>
              <p className="mt-1 text-sm text-muted">Create series, add chapters, and manage manga files.</p>
            </Link>}
            {canManageAnime && <Link className={cardClass} href="/admin/content?library=anime">
              <Clapperboard className="h-5 w-5 text-purple-300" />
              <h2 className="mt-4 font-heading text-base font-semibold">Anime Series &amp; Movies</h2>
              <p className="mt-1 text-sm text-muted">Create anime entries, add episodes, and manage video links.</p>
            </Link>}
            {canManageMembers && <Link className={cardClass} href="/admin/roles">
              <Users className="h-5 w-5 text-cyan-300" />
              <h2 className="mt-4 font-heading text-base font-semibold">Members &amp; Roles</h2>
              <p className="mt-1 text-sm text-muted">Assign site roles, including Codester and library editors.</p>
            </Link>}
            {canModerate && <Link className={cardClass} href="/admin/moderation">
              <MessageSquare className="h-5 w-5 text-yellow-200" />
              <h2 className="mt-4 font-heading text-base font-semibold">Moderation</h2>
              <p className="mt-1 text-sm text-muted">Review reports, mutes, bans, appeals, and member feedback.</p>
            </Link>}
            {canReviewPayments && <Link className={cardClass} href="/admin/frames">
              <CreditCard className="h-5 w-5 text-rose-300" />
              <h2 className="mt-4 font-heading text-base font-semibold">Frame Payments</h2>
              <p className="mt-1 text-sm text-muted">Review profile frame store payment requests.</p>
            </Link>}
          </div>
        )}
      </main>
    </>
  );
}
