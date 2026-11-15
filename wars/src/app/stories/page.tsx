"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera, Clock3, ImagePlus, RefreshCw, Send, Trash2 } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { useAuth } from "@/features/auth/useAuth";
import { createClient } from "@/lib/supabase/client";

interface Story {
  id: string;
  user_id: string;
  storage_path: string | null;
  mime_type: string | null;
  caption: string;
  created_at: string;
  expires_at: string;
  media_url: string | null;
  profile: { id: string; username: string; display_name: string | null; avatar_path: string | null } | null;
}

export default function StoriesPage() {
  const { user, loading: authLoading } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const previewUrl = useMemo(() => file ? URL.createObjectURL(file) : "", [file]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const loadStories = useCallback(async () => {
    const response = await fetch("/api/stories", { cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error ?? "Could not load Stories.");
    setStories(result.stories ?? []);
  }, []);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;
    void loadStories().catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load Stories."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, loadStories]);

  async function publish() {
    if (busy || (!file && !caption.trim())) return;
    setBusy(true); setError(""); setNotice("");
    try {
      if (file) {
        const preparedResponse = await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "prepare-upload", name: file.name, mimeType: file.type, size: file.size }) });
        const prepared = await preparedResponse.json().catch(() => ({}));
        if (!preparedResponse.ok) throw new Error(prepared.error ?? "Could not prepare upload.");
        const { error: uploadError } = await createClient().storage.from("user-stories").uploadToSignedUrl(prepared.path, prepared.token, file, { contentType: file.type, cacheControl: "60" });
        if (uploadError) throw new Error(uploadError.message || "Could not upload Story media.");
        const publishResponse = await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publish", path: prepared.path, caption: caption.trim() }) });
        const result = await publishResponse.json().catch(() => ({}));
        if (!publishResponse.ok) throw new Error(result.error ?? "Could not publish Story.");
      } else {
        const response = await fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "text", caption: caption.trim() }) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "Could not publish Story.");
      }
      setCaption(""); setFile(null); setNotice("Your Story is live for friends for 24 hours.");
      await loadStories();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not publish Story.");
    } finally {
      setBusy(false);
    }
  }

  async function removeStory(storyId: string) {
    if (!window.confirm("Remove this Story now?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/stories", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", storyId }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not remove Story.");
      setStories((current) => current.filter((story) => story.id !== storyId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not remove Story.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || (user && loading)) return <><TopBar /><main className="mx-auto max-w-5xl px-4 py-10"><div className="h-64 animate-pulse rounded-2xl bg-panel" /></main></>;
  if (!user) return <><TopBar /><main className="mx-auto max-w-lg px-4 py-20 text-center"><Camera className="mx-auto h-9 w-9 text-accent" /><h1 className="mt-4 font-heading text-2xl font-semibold">Sign in to view Stories</h1><p className="mt-2 text-sm text-muted">Share quick updates with your WARS friends.</p><Link href="/login?next=/stories" className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-[#171a11]">Sign in</Link></main></>;

  const grouped = new Map<string, Story[]>();
  for (const story of stories) grouped.set(story.user_id, [...(grouped.get(story.user_id) ?? []), story]);
  const groups = [...grouped.entries()].sort(([a], [b]) => Number(b === user.id) - Number(a === user.id));

  return <><TopBar /><main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
    <header className="mb-7 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[1.5px] text-accent">Friends, right now</p><h1 className="mt-1 font-heading text-3xl font-semibold">WARS Stories</h1><p className="mt-2 text-sm text-muted">Photo, video, or text updates disappear after 24 hours. Only accepted friends can see them.</p></div><button type="button" onClick={() => void loadStories()} aria-label="Refresh Stories" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted hover:text-foreground"><RefreshCw className="h-4 w-4" /></button></header>
    {error && <p role="alert" className="mb-4 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}{notice && <p role="status" className="mb-4 rounded-lg border border-[#41613a] bg-[#1b2a20] px-3 py-2 text-sm text-[#b8f28a]">{notice}</p>}
    <section className="mb-8 rounded-2xl border border-line bg-panel p-5"><h2 className="font-heading text-lg font-semibold">Share a Story</h2><textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={300} rows={3} placeholder="What’s happening?" className="mt-3 w-full resize-y rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
      {file && <div className="mt-3 overflow-hidden rounded-xl border border-line bg-black">{file.type.startsWith("video/") ? <video src={previewUrl} controls playsInline className="max-h-72 w-full" /> : <img src={previewUrl} alt="Story preview" className="max-h-72 w-full object-contain" />}</div>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-muted hover:text-foreground"><ImagePlus className="h-4 w-4" />{file ? "Change photo/video" : "Choose photo/video"}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="sr-only" /></label><div className="flex items-center gap-3"><span className="text-xs text-muted">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB · max 25 MB` : `${caption.length}/300`}</span>{file && <button type="button" onClick={() => setFile(null)} className="text-xs text-muted hover:text-pink">Clear file</button>}<button type="button" onClick={() => void publish()} disabled={busy || (!file && !caption.trim())} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-[#171a11] disabled:opacity-50"><Send className="h-4 w-4" />{busy ? "Publishing…" : "Post Story"}</button></div></div>
    </section>
    <div className="space-y-6">{groups.map(([ownerId, items]) => { const profile = items[0].profile; const name = profile?.display_name || profile?.username || "Reader"; return <section key={ownerId} className="rounded-2xl border border-line bg-panel p-5"><div className="mb-4 flex items-center gap-3"><ProfileAvatar userId={ownerId} avatarPath={profile?.avatar_path} name={name} size={42} /><div><p className="text-sm font-semibold">{ownerId === user.id ? "Your Stories" : name}</p>{ownerId !== user.id && profile && <Link href={`/dashboard/${encodeURIComponent(profile.username)}`} className="text-xs text-muted hover:text-foreground">@{profile.username}</Link>}</div></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((story) => <article key={story.id} className="overflow-hidden rounded-xl border border-line bg-background">{story.media_url ? story.mime_type?.startsWith("video/") ? <video src={story.media_url} controls playsInline preload="metadata" className="aspect-[4/5] w-full bg-black object-contain" /> : <img src={story.media_url} alt={story.caption || `${name}'s Story`} className="aspect-[4/5] w-full bg-black object-contain" /> : <div className="grid aspect-[4/5] place-items-center bg-gradient-to-br from-[#292038] via-[#1a1a23] to-[#142b2b] p-6 text-center"><p className="whitespace-pre-wrap break-words font-heading text-xl font-semibold">{story.caption}</p></div>}{story.media_url && story.caption && <p className="px-3 py-2 text-sm">{story.caption}</p>}<div className="flex items-center justify-between border-t border-line px-3 py-2 text-[11px] text-muted"><span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" />Expires {new Date(story.expires_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>{ownerId === user.id && <button type="button" onClick={() => void removeStory(story.id)} disabled={busy} aria-label="Delete Story" className="text-muted hover:text-pink disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>}</div></article>)}</div></section>; })}</div>
    {stories.length === 0 && <div className="rounded-2xl border border-dashed border-line p-10 text-center"><p className="font-semibold">No active Stories yet</p><p className="mt-1 text-sm text-muted">Post an update or add a friend to see their Stories here.</p><Link href="/friends" className="mt-4 inline-flex rounded-lg border border-line px-4 py-2 text-sm font-semibold">Find friends</Link></div>}
  </main></>;
}
