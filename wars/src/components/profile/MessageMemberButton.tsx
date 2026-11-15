"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { useState } from "react";

export function MessageMemberButton({
  username,
  canReceivePrivateMessages,
  isSignedIn,
  isOwnProfile,
}: {
  username: string;
  canReceivePrivateMessages: boolean;
  isSignedIn: boolean;
  isOwnProfile: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (isOwnProfile) return null;

  if (!canReceivePrivateMessages) {
    return (
      <Link
        href="/#feedback"
        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        Contact through Feedback
      </Link>
    );
  }

  if (!isSignedIn) {
    const next = `/dashboard/${encodeURIComponent(username)}`;
    return (
      <Link
        href={`/login?next=${encodeURIComponent(next)}`}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        Sign in to message
      </Link>
    );
  }

  async function startConversation() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat/dms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not open this conversation.");
      const conversationId = result.conversation?.id;
      if (typeof conversationId !== "string") throw new Error("Could not open this conversation.");
      router.push(`/anichat?conversation=${encodeURIComponent(conversationId)}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open this conversation.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void startConversation()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-foreground hover:border-accent/60 disabled:cursor-wait disabled:opacity-60"
      >
        <MessageCircle className="h-4 w-4" />
        {busy ? "Opening…" : "Message"}
      </button>
      {error && <p className="mt-2 max-w-xs text-xs text-pink" role="alert">{error}</p>}
    </div>
  );
}
