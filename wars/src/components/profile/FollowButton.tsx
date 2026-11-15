"use client";

import Link from "next/link";
import { useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";

export function FollowButton({
  targetUserId,
  username,
  isSignedIn,
  isOwnProfile,
  initialFollowing,
  initialFollowerCount,
  available,
}: {
  targetUserId: string;
  username: string;
  isSignedIn: boolean;
  isOwnProfile: boolean;
  initialFollowing: boolean;
  initialFollowerCount: number;
  available: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggleFollow() {
    if (busy || !available) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/follows", {
        method: following ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not update follow status.");
      setFollowing(Boolean(result.following));
      setFollowerCount(Number(result.followerCount ?? followerCount));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update follow status.");
    } finally {
      setBusy(false);
    }
  }

  if (isOwnProfile) {
    return <span className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted">Your dashboard</span>;
  }

  if (!isSignedIn) {
    return <Link href={`/login?next=${encodeURIComponent(`/dashboard/${username}`)}`} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11]"><UserPlus className="h-4 w-4" /> Sign in to follow</Link>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void toggleFollow()}
        disabled={busy || !available}
        aria-pressed={following}
        title={!available ? "The follow database migration needs to be applied." : undefined}
        className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${following ? "border border-line bg-panel2 text-foreground hover:border-red-400/60 hover:text-red-200" : "bg-accent text-[#171a11]"}`}
      >
        {following ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
        {busy ? "Saving…" : following ? "Following" : "Follow"}
      </button>
      <p className="mt-1 text-xs text-muted">{followerCount} {followerCount === 1 ? "follower" : "followers"}</p>
      {!available && <p className="mt-2 max-w-sm text-xs text-muted">Follow needs the latest WARS database migration.</p>}
      {error && <p className="mt-2 max-w-sm text-xs text-pink" role="alert">{error}</p>}
    </div>
  );
}
