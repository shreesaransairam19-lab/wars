"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface ChapterFormProps {
  seriesId: string;
  nextChapterNumber: number;
  onCreated?: () => void;
}

export function ChapterForm({ seriesId, nextChapterNumber, onCreated }: ChapterFormProps) {
  const [title, setTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState(nextChapterNumber);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function autoSlug(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          series_id: seriesId,
          title: title || `Chapter ${chapterNumber}`,
          slug: autoSlug(title || `chapter-${chapterNumber}`),
          chapter_number: chapterNumber,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create chapter");
        return;
      }

      setSuccess(true);
      setTitle("");
      setChapterNumber((n) => n + 1);
      onCreated?.();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-line bg-panel2 p-3"
    >
      <h4 className="mb-2 font-heading text-xs font-semibold">Add Chapter</h4>

      {error && (
        <div role="alert" className="mb-2 rounded-lg border border-[#704044] bg-[#332329] px-3 py-1.5 text-[10px] text-[#ffb2b2]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-2 rounded-lg border border-[#39452b] bg-[#22291c] px-3 py-1.5 text-[10px] text-accent">
          Chapter created!
        </div>
      )}

      <div className="grid grid-cols-[70px_1fr_auto] gap-2">
        <div>
          <label htmlFor="ch-num" className="sr-only">Chapter number</label>
          <input
            id="ch-num"
            type="number"
            min={1}
            className="w-full rounded-lg border border-line bg-[#121217] px-2 py-1.5 text-[10px] text-foreground outline-none focus:border-accent"
            value={chapterNumber}
            onChange={(e) => setChapterNumber(parseInt(e.target.value, 10) || 1)}
            required
          />
        </div>
        <div>
          <label htmlFor="ch-title" className="sr-only">Chapter title</label>
          <input
            id="ch-title"
            className="w-full rounded-lg border border-line bg-[#121217] px-2 py-1.5 text-[10px] text-foreground outline-none focus:border-accent"
            placeholder="Chapter title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-[10px] font-bold text-[#171a11] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>
    </form>
  );
}
