"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { PROFILE_FRAMES } from "@/lib/profile-frames/catalog";

export function ProfileFramesPanel({
  equippedFrameId,
  onEquipped,
}: {
  equippedFrameId: string | null;
  onEquipped: () => void;
}) {
  const [ownedFrameIds, setOwnedFrameIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadFrames = useCallback(async () => {
    try {
      const response = await fetch("/api/profile-frames", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not load owned frames");
      setOwnedFrameIds(data.ownedFrameIds ?? []);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load owned frames");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadFrames(); }, [loadFrames]);

  async function equip(frameId: string | null) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/profile-frames", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(frameId ? { action: "equip", frameId } : { action: "unequip" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not update your frame");
      onEquipped();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update your frame");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-panel p-6 md:p-8" aria-labelledby="profile-frames-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-purple">Personalize</p>
          <h2 id="profile-frames-title" className="mt-1 font-heading text-xl font-semibold">Profile frames</h2>
          <p className="mt-1 text-sm text-muted">Switch between the frames you own at any time.</p>
        </div>
        <Link href="/profile/frames" className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11]"><Sparkles className="h-4 w-4" /> Open frame store</Link>
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}
      {loading ? <div className="mt-5 h-20 animate-pulse rounded-xl bg-panel2" /> : ownedFrameIds.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No profile frames unlocked yet. Browse the store to get your first frame.</div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {ownedFrameIds.map((frameId) => {
            const frame = PROFILE_FRAMES.find((item) => item.id === frameId);
            if (!frame) return null;
            const equipped = equippedFrameId === frame.id;
            return <div key={frame.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-background p-3">
              <div className="flex min-w-0 items-center gap-3"><ProfileAvatar name="WARS" role="reader" frameId={frame.id} size={44} /><div className="min-w-0"><p className="truncate text-sm font-semibold">{frame.name}</p><p className="text-xs text-muted">Unlocked frame</p></div></div>
              <button type="button" disabled={saving || equipped} onClick={() => void equip(frame.id)} className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-semibold disabled:opacity-60">{equipped ? <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> In use</span> : saving ? "Saving…" : "Equip"}</button>
            </div>;
          })}
        </div>
      )}
      {equippedFrameId && <button type="button" disabled={saving} onClick={() => void equip(null)} className="mt-4 text-xs text-muted underline decoration-line underline-offset-4 hover:text-foreground disabled:opacity-50">Use my role frame instead</button>}
    </section>
  );
}
