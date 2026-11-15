"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Users, X } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

const PARTY_REACTIONS = ["👍", "❤️", "😂", "🔥", "👏", "🍿"];
interface PartyMessage { id: string; userId: string; username: string; content: string; createdAt: number; }
interface ReactionPop { id: string; emoji: string; username: string; }

export function WatchPartyRoom({ partyId, hostId, currentUserId, username, episodeTitle, videoUrl }: {
  partyId: string; hostId: string; currentUserId: string; username: string; episodeTitle: string; videoUrl: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [messages, setMessages] = useState<PartyMessage[]>([]);
  const [input, setInput] = useState("");
  const [reactionPops, setReactionPops] = useState<ReactionPop[]>([]);
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const isHost = currentUserId === hostId;

  const broadcastSync = useCallback(async () => {
    const channel = channelRef.current;
    const video = videoRef.current;
    if (!isHost || !channel || !video) return;
    await channel.send({ type: "broadcast", event: "sync", payload: { senderId: currentUserId, currentTime: video.currentTime, paused: video.paused, sentAt: Date.now() } });
  }, [currentUserId, isHost]);

  useEffect(() => {
    if (!isSupabaseConfigured()) { setError("Watch Party live sync is not configured."); return; }
    const supabase = createClient();
    const channel = supabase.channel(`watch-party:${partyId}`, { config: { private: true, broadcast: { self: false }, presence: { key: currentUserId } } });
    channelRef.current = channel;
    channel
      .on("presence", { event: "sync" }, () => setOnlineCount(Object.keys(channel.presenceState()).length))
      .on("broadcast", { event: "sync" }, ({ payload }) => {
        if (isHost || payload?.senderId !== hostId || typeof payload?.currentTime !== "number") return;
        const video = videoRef.current;
        if (!video) return;
        const desiredTime = payload.currentTime + (payload.paused ? 0 : Math.max(0, (Date.now() - Number(payload.sentAt || Date.now())) / 1000));
        if (Math.abs(video.currentTime - desiredTime) > 1.5) video.currentTime = desiredTime;
        if (payload.paused && !video.paused) video.pause();
        else if (!payload.paused && video.paused) void video.play().catch(() => setError("Tap the video once to allow synchronized playback."));
      })
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        const message = payload?.message as PartyMessage | undefined;
        if (message && typeof message.id === "string" && typeof message.content === "string" && message.content.length <= 300 && typeof message.username === "string") setMessages((current) => current.some((item) => item.id === message.id) ? current : [...current, message].slice(-100));
      })
      .on("broadcast", { event: "reaction" }, ({ payload }) => {
        if (typeof payload?.emoji !== "string" || typeof payload?.username !== "string") return;
        const id = crypto.randomUUID();
        setReactionPops((current) => [...current, { id, emoji: payload.emoji, username: payload.username }].slice(-8));
        window.setTimeout(() => setReactionPops((current) => current.filter((item) => item.id !== id)), 2600);
      })
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: currentUserId, username });
          setError("");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setError("Could not connect to this Watch Party. Refresh to retry.");
        }
      });
    return () => { channelRef.current = null; void supabase.removeChannel(channel); };
  }, [currentUserId, isHost, partyId, username]);

  useEffect(() => {
    if (!isHost || !connected) return;
    void broadcastSync();
    const timer = window.setInterval(() => void broadcastSync(), 2000);
    return () => window.clearInterval(timer);
  }, [broadcastSync, connected, isHost]);

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    const content = input.trim().slice(0, 300);
    if (!content || !channelRef.current || !connected) return;
    const message: PartyMessage = { id: crypto.randomUUID(), userId: currentUserId, username, content, createdAt: Date.now() };
    setMessages((current) => [...current, message].slice(-100));
    setInput("");
    const status = await channelRef.current.send({ type: "broadcast", event: "chat", payload: { message } });
    if (status !== "ok") { setMessages((current) => current.filter((item) => item.id !== message.id)); setInput(content); setError("Chat message did not send. Retry when the connection returns."); }
  }

  async function react(emoji: string) {
    if (!channelRef.current || !connected) return;
    await channelRef.current.send({ type: "broadcast", event: "reaction", payload: { emoji, username } });
  }

  async function closeParty() {
    if (!window.confirm("Close this Watch Party for everyone?")) return;
    setClosing(true); setError("");
    try {
      const response = await fetch("/api/watch-parties", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close", partyId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not close party.");
      window.location.assign("/watch-parties");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not close party."); setClosing(false); }
  }

  return <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_340px] md:px-6">
    <section className="min-w-0"><Link href="/watch-parties" className="mb-4 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Watch Parties</Link><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[1.4px] text-purple">Synchronized Watch Party</p><h1 className="mt-1 font-heading text-2xl font-semibold">{episodeTitle}</h1><p className="mt-1 text-xs text-muted">{isHost ? "You’re hosting · you control playback" : "Synced to the host’s playback"}</p></div><span className="inline-flex items-center gap-1.5 text-xs text-muted"><span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />{connected ? "Live" : "Connecting…"}</span></div>
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black"><video ref={videoRef} src={videoUrl} controls={isHost} playsInline preload="metadata" className="aspect-video w-full" aria-label={episodeTitle} onClick={() => { if (!isHost && videoRef.current?.paused) void videoRef.current.play().catch(() => setError("Tap to allow playback in your browser.")); }} onPlay={() => void broadcastSync()} onPause={() => void broadcastSync()} onSeeked={() => void broadcastSync()} /><div className="pointer-events-none absolute inset-0 overflow-hidden">{reactionPops.map((pop, index) => <div key={pop.id} className="absolute bottom-16 animate-[float-up_2.5s_ease-out_forwards] text-3xl drop-shadow-lg" style={{ left: `${12 + (index * 17) % 75}%` }}><span>{pop.emoji}</span><span className="ml-1 rounded bg-black/60 px-1 text-[10px] text-white">{pop.username}</span></div>)}</div></div>
      <div className="mt-3 flex flex-wrap items-center gap-2">{PARTY_REACTIONS.map((emoji) => <button key={emoji} type="button" onClick={() => void react(emoji)} disabled={!connected} aria-label={`React ${emoji}`} className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-panel text-lg hover:border-accent disabled:opacity-50">{emoji}</button>)}{isHost && <button type="button" onClick={() => void closeParty()} disabled={closing} className="ml-auto inline-flex items-center gap-2 rounded-lg border border-[#704044] px-3 py-2 text-sm text-pink disabled:opacity-50"><X className="h-4 w-4" />{closing ? "Closing…" : "End party"}</button>}</div>
      {error && <p role="alert" className="mt-3 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}
    </section>
    <aside className="flex min-h-[360px] flex-col rounded-2xl border border-line bg-panel"><header className="flex items-center justify-between border-b border-line px-4 py-3"><h2 className="font-heading font-semibold">Party chat</h2><span className="inline-flex items-center gap-1.5 text-xs text-muted"><Users className="h-3.5 w-3.5" />{onlineCount}</span></header><div className="flex-1 space-y-2 overflow-y-auto p-3" aria-live="polite">{messages.length ? messages.map((message) => <p key={message.id} className="break-words text-sm"><span className="font-semibold text-accent">{message.username}</span><span className="mx-1 text-[10px] text-muted">{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span><br />{message.content}</p>) : <p className="py-4 text-center text-sm text-muted">No party chat yet. Say hello!</p>}</div><form onSubmit={(event) => void sendChat(event)} className="flex gap-2 border-t border-line p-3"><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={300} placeholder="Message the party" aria-label="Party chat message" disabled={!connected} className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent" /><button type="submit" disabled={!connected || !input.trim()} aria-label="Send party message" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent text-[#171a11] disabled:opacity-50"><Send className="h-4 w-4" /></button></form></aside>
  </div>;
}
