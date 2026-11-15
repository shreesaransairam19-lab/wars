"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Clapperboard, Play, RefreshCw, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { useAuth } from "@/features/auth/useAuth";

interface PartyEpisode { id: string; title: string | null; slug: string; chapter_number: number; series: { title: string; slug: string } | null; }
interface Friend { id: string; username: string; display_name: string | null; avatar_path: string | null; }
interface PartyRow { id: string; membershipStatus: string; episode: PartyEpisode | null; host: { username: string; display_name: string | null } | null; }
interface LobbyData { friends: Friend[]; episodes: PartyEpisode[]; invitations: PartyRow[]; parties: PartyRow[]; }

export default function WatchPartiesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<LobbyData>({ friends: [], episodes: [], invitations: [], parties: [] });
  const [selectedEpisode, setSelectedEpisode] = useState("");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/watch-parties", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "Could not load Watch Parties.");
    setData(result as LobbyData);
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    void load().catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load Watch Parties."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, load]);

  async function invite(action: "accept" | "decline", partyId: string) {
    setBusy(partyId); setError("");
    try {
      const response = await fetch("/api/watch-parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, partyId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not update invitation.");
      await load();
      if (action === "accept") router.push(`/watch-party/${partyId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update invitation."); }
    finally { setBusy(""); }
  }

  async function createParty(event: FormEvent) {
    event.preventDefault();
    setBusy("create"); setError("");
    try {
      const response = await fetch("/api/watch-parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", chapterId: selectedEpisode, friendIds: selectedFriends }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not create Watch Party.");
      router.push(`/watch-party/${result.partyId}`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create Watch Party."); }
    finally { setBusy(""); }
  }

  if (authLoading || (user && loading)) return <><TopBar /><main className="mx-auto max-w-5xl px-4 py-10"><div className="h-64 animate-pulse rounded-2xl bg-panel" /></main></>;
  if (!user) return <><TopBar /><main className="mx-auto max-w-lg px-4 py-20 text-center"><Clapperboard className="mx-auto h-9 w-9 text-accent" /><h1 className="mt-4 font-heading text-2xl font-semibold">Sign in to start a Watch Party</h1><Link href="/login?next=/watch-parties" className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-[#171a11]">Sign in</Link></main></>;

  const episodeLabel = (episode: PartyEpisode | null) => episode ? `${episode.series?.title ?? "Anime"} · Episode ${episode.chapter_number}${episode.title ? ` — ${episode.title}` : ""}` : "Anime episode";
  return <><TopBar /><main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">Watch together</p><h1 className="mt-1 font-heading text-3xl font-semibold">Watch Parties</h1><p className="mt-2 max-w-2xl text-sm text-muted">Invite accepted friends to sync an Anime Library episode, chat, and react live. Party playback currently uses direct MP4/WebM episodes.</p></div><button type="button" onClick={() => void load()} aria-label="Refresh Watch Parties" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted hover:text-foreground"><RefreshCw className="h-4 w-4" /></button></header>
    {error && <p role="alert" className="mb-5 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}
    <form onSubmit={(event) => void createParty(event)} className="mb-7 rounded-2xl border border-line bg-panel p-5"><h2 className="font-heading text-lg font-semibold">Create a party</h2><label htmlFor="party-episode" className="mt-4 block text-xs font-semibold">Choose an episode or movie</label><select id="party-episode" required value={selectedEpisode} onChange={(event) => setSelectedEpisode(event.target.value)} className="mt-1 w-full rounded-lg border border-line bg-background px-3 py-2.5 text-sm"><option value="">Select Anime Library content</option>{data.episodes.map((episode) => <option key={episode.id} value={episode.id}>{episodeLabel(episode)}</option>)}</select>
      <div className="mt-4 flex items-center gap-2"><Users className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold">Invite friends <span className="text-xs font-normal text-muted">({selectedFriends.length}/10)</span></h3></div>{data.friends.length ? <div className="mt-2 grid gap-2 sm:grid-cols-2">{data.friends.map((friend) => { const name = friend.display_name || friend.username; const checked = selectedFriends.includes(friend.id); return <label key={friend.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${checked ? "border-accent bg-accent/5" : "border-line bg-background"}`}><input type="checkbox" checked={checked} disabled={!checked && selectedFriends.length >= 10} onChange={(event) => setSelectedFriends((ids) => event.target.checked ? [...ids, friend.id] : ids.filter((id) => id !== friend.id))} /><ProfileAvatar userId={friend.id} avatarPath={friend.avatar_path} name={name} size={34} /><span className="truncate text-sm font-semibold">{name} <span className="font-normal text-muted">@{friend.username}</span></span></label>; })}</div> : <p className="mt-2 rounded-lg border border-dashed border-line p-4 text-sm text-muted">Add a friend before creating a Watch Party. <Link className="underline" href="/friends">Open Friends</Link></p>}
      <button type="submit" disabled={busy === "create" || !selectedEpisode || !selectedFriends.length} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11] disabled:opacity-50"><Clapperboard className="h-4 w-4" />{busy === "create" ? "Creating…" : "Create and invite"}</button>
    </form>
    <section className="mb-7 rounded-2xl border border-line bg-panel p-5"><h2 className="font-heading text-lg font-semibold">Invitations <span className="text-sm text-muted">({data.invitations.length})</span></h2>{data.invitations.length ? <div className="mt-3 space-y-2">{data.invitations.map((party) => <article key={party.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-background p-3"><div><p className="text-sm font-semibold">{episodeLabel(party.episode)}</p><p className="mt-1 text-xs text-muted">Invite from {party.host?.display_name || party.host?.username || "a friend"}</p></div><div className="flex gap-2"><button type="button" onClick={() => void invite("accept", party.id)} disabled={Boolean(busy)} className="rounded-lg bg-accent px-3 py-2 text-xs font-bold text-[#171a11] disabled:opacity-50">Join</button><button type="button" onClick={() => void invite("decline", party.id)} disabled={Boolean(busy)} className="rounded-lg border border-line px-3 py-2 text-xs text-muted disabled:opacity-50">Decline</button></div></article>)}</div> : <p className="mt-3 text-sm text-muted">No pending invitations.</p>}</section>
    <section className="rounded-2xl border border-line bg-panel p-5"><h2 className="font-heading text-lg font-semibold">Active parties</h2>{data.parties.length ? <div className="mt-3 space-y-2">{data.parties.map((party) => <Link key={party.id} href={`/watch-party/${party.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-background p-3 hover:border-accent/60"><span><span className="block text-sm font-semibold">{episodeLabel(party.episode)}</span><span className="mt-1 block text-xs text-muted">Hosted by {party.host?.display_name || party.host?.username || "a friend"}</span></span><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/10 text-accent"><Play className="h-4 w-4" /></span></Link>)}</div> : <p className="mt-3 text-sm text-muted">You have no active parties yet.</p>}</section>
  </main></>;
}
