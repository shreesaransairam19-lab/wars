import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { ModerationPanel } from "@/components/admin/ModerationPanel";
import { createClient } from "@/lib/supabase/server";
import { hasAnyRole } from "@/lib/permissions/guards";

export default async function ModerationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const canModerate = Boolean(user && await hasAnyRole(user.id, ["owner", "admin", "moderator"]));

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">Staff</span>
            <h1 className="mt-1 font-heading text-2xl font-semibold tracking-tight">Chat Moderation</h1>
            <p className="mt-1 text-sm text-muted">Review member status and apply chat rules.</p>
          </div>
          <Link href="/chat" className="rounded-lg border border-line bg-panel px-3 py-2 text-sm text-muted hover:text-foreground">Back to chat</Link>
        </div>
        {!user ? (
          <div className="mt-6 rounded-xl border border-line bg-panel p-6 text-center"><p className="font-semibold">Sign in required</p><Link href="/login" className="mt-2 inline-block text-sm text-accent">Sign in to continue</Link></div>
        ) : !canModerate ? (
          <div className="mt-6 rounded-xl border border-line bg-panel p-6 text-center"><p className="font-semibold">Moderator, Admin, or Owner access required</p></div>
        ) : <ModerationPanel />}
      </main>
    </>
  );
}
