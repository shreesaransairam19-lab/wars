"use client";

import { useEffect, useState } from "react";
import { StarRating } from "./StarRating";

interface Review {
  id: string;
  content: string;
  created_at: string;
  status?: string;
  profiles: { username: string; avatar_path: string | null } | null;
  chapters: { chapter_number: number } | null;
}

export function ReviewSection({
  seriesId,
  canModerate,
}: {
  seriesId: string;
  canModerate: boolean;
}) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchReviews() {
      const res = await fetch(`/api/reviews?series_id=${seriesId}`);
      if (!res.ok) return;
      const json = await res.json();
      if (cancelled) return;
      setReviews(json.reviews ?? []);
    }
    void fetchReviews();
    return () => {
      cancelled = true;
    };
  }, [seriesId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ series_id: seriesId, content }),
    });
    const json = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(json.error ?? "Could not submit review");
      return;
    }
    setContent("");
    setMessage("Review submitted — awaiting moderation.");
    const refresh = await fetch(`/api/reviews?series_id=${seriesId}`);
    if (refresh.ok) {
      const json = await refresh.json();
      setReviews(json.reviews ?? []);
    }
  }

  async function moderate(id: string, action: "approve" | "reject" | "remove") {
    await fetch("/api/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const refresh = await fetch(`/api/reviews?series_id=${seriesId}`);
    if (refresh.ok) {
      const json = await refresh.json();
      setReviews(json.reviews ?? []);
    }
  }

  return (
    <section className="mt-10" aria-labelledby="reviews-title">
      <div className="mb-3 flex items-center justify-between">
        <h2 id="reviews-title" className="font-heading text-lg font-semibold">
          Reviews
        </h2>
        <StarRating seriesId={seriesId} />
      </div>

      <form onSubmit={submit} className="mb-4 space-y-2">
        <label htmlFor="review-content" className="sr-only">
          Write a review
        </label>
        <textarea
          id="review-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={5000}
          placeholder="Share your thoughts (spoiler-free, please)..."
          className="w-full resize-y rounded-lg border border-line bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy || content.trim().length === 0}
            className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-[#171a11] disabled:opacity-50"
          >
            {busy ? "Posting..." : "Post review"}
          </button>
          {message && <span className="text-[11px] text-muted">{message}</span>}
        </div>
      </form>

      <ul className="space-y-2">
        {reviews.length === 0 && (
          <li className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-xs text-muted">
            No approved reviews yet.
          </li>
        )}
        {reviews.map((review) => (
          <li key={review.id} className="rounded-lg border border-line bg-panel p-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted">
              <span className="font-semibold text-foreground">
                {review.profiles?.username ?? "reader"}
                {review.chapters && ` · Ch. ${review.chapters.chapter_number}`}
              </span>
              <time dateTime={review.created_at}>
                {new Date(review.created_at).toLocaleDateString()}
              </time>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed">{review.content}</p>
            {canModerate && (
              <div className="mt-2 flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => moderate(review.id, "approve")}
                  className="rounded border border-line px-2 py-1 hover:text-accent"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => moderate(review.id, "reject")}
                  className="rounded border border-line px-2 py-1 hover:text-pink"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => moderate(review.id, "remove")}
                  className="rounded border border-line px-2 py-1 hover:text-pink"
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
