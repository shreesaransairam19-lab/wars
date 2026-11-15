"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Check, MessageCircle, UserPlus, Users, X } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { useAuth } from "@/features/auth/useAuth";

interface FriendEntry {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
  member: { id: string; username: string; display_name: string | null; avatar_path: string | null } | null;
}

interface FriendData {
  incoming: FriendEntry[];
  outgoing: FriendEntry[];
  friends: FriendEntry[];
}

export default function FriendsPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<FriendData>({ incoming: [], outgoing: [], friends: [] });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/friends", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "Could not load friends.");
    setData(result as FriendData);
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    void load().catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load friends."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, load]);

  async function update(requestId: string, action: "accept" | "reject" | "cancel" | "unfriend") {
    setBusy(requestId);
    setError("");
    try {
      const response = await fetch("/api/friends", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, action }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not update this friend request.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update this friend request.");
    } finally {
      setBusy("");
    }
  }

  if (authLoading || (user && loading)) return <><TopBar /><main className="mx-auto max-w-4xl px-4 py-10"><div className="h-56 animate-pulse rounded-2xl bg-panel" /></main></>;
  if (!user) return <><TopBar /><main className="mx-auto max-w-lg px-4 py-20 text-center"><Users className="mx-auto h-9 w-9 text-accent" /><h1 className="mt-4 font-heading text-2xl font-semibold">Sign in to see your friends</h1><Link href="/login?next=/friends" className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-[#171a11]">Sign in</Link></main></>;

  const renderMember = (entry: FriendEntry, actions?: ReactNode) => {
    const member = entry.member;
    if (!member) return null;
    const name = member.display_name || member.username;
    return <article key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-panel p-3">
      <Link href={`/dashboard/${encodeURIComponent(member.username)}`} className="flex min-w-0 items-center gap-3 hover:opacity-85">
        <ProfileAvatar name={name} avatarPath={member.avatar_path} size={42} />
        <span className="min-w-0"><span className="block truncate text-sm font-semibold">{name}</span><span className="block truncate text-xs text-muted">@{member.username}</span></span>
      </Link>
      <div className="flex items-center gap-2">{actions}<Link href={`/dashboard/${encodeURIComponent(member.username)}`} aria-label={`Open ${name}'s profile`} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted hover:text-foreground">Profile</Link></div>
    </article>;
  };

  return <><TopBar /><main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
    <header className="mb-7"><p className="text-[11px] font-bold uppercase tracking-[1.5px] text-accent">Your community</p><h1 className="mt-1 font-heading text-3xl font-semibold">Friends</h1><p className="mt-2 text-sm text-muted">Accept requests to connect. Existing follows stay separate.</p></header>
    {error && <p role="alert" className="mb-5 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}
    <section className="mb-7 rounded-2xl border border-line bg-panel p-5"><div className="mb-3 flex items-center gap-2"><UserPlus className="h-4 w-4 text-accent" /><h2 className="font-heading text-lg font-semibold">Friend requests <span className="text-sm text-muted">({data.incoming.length})</span></h2></div>
      {data.incoming.length ? <div className="space-y-2">{data.incoming.map((entry) => renderMember(entry, <><button type="button" onClick={() => void update(entry.id, "accept")} disabled={Boolean(busy)} className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-[#171a11] disabled:opacity-50"><Check className="h-3.5 w-3.5" />Accept</button><button type="button" onClick={() => void update(entry.id, "reject")} disabled={Boolean(busy)} aria-label="Reject request" className="grid h-8 w-8 place-items-center rounded-lg border border-line text-muted hover:text-pink disabled:opacity-50"><X className="h-4 w-4" /></button></>))}</div> : <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">No pending requests.</p>}
    </section>
    <section className="mb-7 rounded-2xl border border-line bg-panel p-5"><div className="mb-3 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-purple" /><h2 className="font-heading text-lg font-semibold">Sent requests <span className="text-sm text-muted">({data.outgoing.length})</span></h2></div>
      {data.outgoing.length ? <div className="space-y-2">{data.outgoing.map((entry) => renderMember(entry, <button type="button" onClick={() => void update(entry.id, "cancel")} disabled={Boolean(busy)} className="rounded-lg border border-line px-3 py-2 text-xs text-muted hover:text-foreground disabled:opacity-50">Cancel</button>))}</div> : <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">No sent requests.</p>}
    </section>
    <section className="rounded-2xl border border-line bg-panel p-5"><div className="mb-3 flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><h2 className="font-heading text-lg font-semibold">Your friends <span className="text-sm text-muted">({data.friends.length})</span></h2></div>
      {data.friends.length ? <div className="space-y-2">{data.friends.map((entry) => renderMember(entry, <Link href="/watch-parties" className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-muted hover:text-foreground">Watch together</Link>))}</div> : <p className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">You haven’t added any friends yet. Visit a member’s dashboard to send a request.</p>}
    </section>
  </main></>;
}
