"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock3, Images } from "lucide-react";

interface ProfileStory {
  id: string;
  mime_type: string | null;
  caption: string;
  expires_at: string;
  media_url: string | null;
}

export function ProfileStories({ userId }: { userId: string }) {
  const [stories, setStories] = useState<ProfileStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/stories?userId=${encodeURIComponent(userId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "Could not load Stories.");
        if (!cancelled) setStories(result.stories ?? []);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load Stories.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading || (!stories.length && !error)) return null;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-panel p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2"><Images className="h-4 w-4 text-accent" /><h2 className="font-heading text-lg font-semibold">Active Stories</h2></div>
        <Link href="/stories" className="text-xs font-semibold text-accent hover:underline">Stories</Link>
      </div>
      {error ? <p role="status" className="text-sm text-muted">{error}</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <article key={story.id} className="overflow-hidden rounded-xl border border-line bg-background">
              {story.media_url
                ? story.mime_type?.startsWith("video/")
                  ? <video src={story.media_url} controls playsInline preload="metadata" className="aspect-[4/5] w-full bg-black object-contain" />
                  : <img src={story.media_url} alt={story.caption || "WARS Story"} className="aspect-[4/5] w-full bg-black object-contain" />
                : <div className="grid aspect-[4/5] place-items-center bg-gradient-to-br from-[#292038] via-[#1a1a23] to-[#142b2b] p-6 text-center"><p className="whitespace-pre-wrap break-words font-heading text-xl font-semibold">{story.caption}</p></div>}
              {story.media_url && story.caption && <p className="px-3 py-2 text-sm">{story.caption}</p>}
              <p className="flex items-center gap-1 border-t border-line px-3 py-2 text-[11px] text-muted"><Clock3 className="h-3 w-3" />Expires {new Date(story.expires_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
