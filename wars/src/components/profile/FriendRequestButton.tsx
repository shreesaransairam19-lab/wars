"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, UserPlus, Users, X } from "lucide-react";

type Relationship = "none" | "incoming" | "outgoing" | "friends";

export function FriendRequestButton({ targetUserId, username, isSignedIn, isOwnProfile }: {
  targetUserId: string;
  username: string;
  isSignedIn: boolean;
  isOwnProfile: boolean;
}) {
  const [relationship, setRelationship] = useState<Relationship>("none");
  const [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSignedIn || isOwnProfile) return;
    let cancelled = false;
    void fetch(`/api/friends?user_id=${encodeURIComponent(targetUserId)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error ?? "Could not load friend status.");
        if (!cancelled) {
          setRelationship(result.relationship ?? "none");
          setRequestId(result.requestId ?? "");
        }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load friend status."); });
    return () => { cancelled = true; };
  }, [isSignedIn, isOwnProfile, targetUserId]);

  async function update(action: "request" | "accept" | "reject" | "cancel" | "unfriend") {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = action === "request"
        ? await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId }) })
        : await fetch("/api/friends", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, action }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not update friend request.");
      setRelationship(result.relationship ?? (action === "request" ? "outgoing" : "none"));
      setRequestId(result.requestId ?? (action === "request" ? requestId : ""));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update friend request.");
    } finally {
      setBusy(false);
    }
  }

  if (isOwnProfile) return <Link href="/friends" className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground"><Users className="h-4 w-4" /> Friends & requests</Link>;
  if (!isSignedIn) return <Link href={`/login?next=${encodeURIComponent(`/dashboard/${username}`)}`} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-foreground"><UserPlus className="h-4 w-4" /> Sign in to add friend</Link>;

  return <div>
    {relationship === "incoming" ? <div className="flex gap-2">
      <button type="button" onClick={() => void update("accept")} disabled={busy || !requestId} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11] disabled:opacity-60"><Check className="h-4 w-4" />{busy ? "Saving…" : "Accept request"}</button>
      <button type="button" onClick={() => void update("reject")} disabled={busy || !requestId} aria-label="Reject friend request" className="grid h-10 w-10 place-items-center rounded-lg border border-line text-muted hover:text-pink disabled:opacity-60"><X className="h-4 w-4" /></button>
    </div> : relationship === "outgoing" ? <button type="button" onClick={() => void update("cancel")} disabled={busy || !requestId} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-muted disabled:opacity-60">{busy ? "Saving…" : "Request sent · Cancel"}</button>
      : relationship === "friends" ? <button type="button" onClick={() => { if (window.confirm(`Remove @${username} from your friends?`)) void update("unfriend"); }} disabled={busy || !requestId} className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-60"><Users className="h-4 w-4" />{busy ? "Saving…" : "Friends · Remove"}</button>
        : <button type="button" onClick={() => void update("request")} disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11] disabled:opacity-60"><UserPlus className="h-4 w-4" />{busy ? "Sending…" : "Add friend"}</button>}
    {error && <p className="mt-2 max-w-xs text-xs text-pink" role="alert">{error}</p>}
  </div>;
}
