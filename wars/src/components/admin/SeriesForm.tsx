"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

interface SeriesFormProps {
  onCreated?: () => void;
}

export function SeriesForm({ onCreated }: SeriesFormProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState<"manga" | "light_novel">("manga");
  const [status, setStatus] = useState<"draft" | "published">("published");
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
      const res = await fetch("/api/series", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug: slug || autoSlug(title),
          description: description || undefined,
          content_type: contentType,
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to create series");
        return;
      }

      setSuccess(true);
      setTitle("");
      setSlug("");
      setDescription("");
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
      className="rounded-xl border border-line bg-panel2 p-4"
    >
      <h3 className="mb-3 font-heading text-sm font-semibold">New Series</h3>

      {error && (
        <div role="alert" className="mb-3 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-xs text-[#ffb2b2]">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 rounded-lg border border-[#39452b] bg-[#22291c] px-3 py-2 text-xs text-accent">
          Series created!
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="series-title" className="mb-1 block text-[10px] font-semibold text-muted">
            Title *
          </label>
          <input
            id="series-title"
            className="w-full rounded-lg border border-line bg-[#121217] px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slug) setSlug(autoSlug(e.target.value));
            }}
            required
            maxLength={200}
          />
        </div>

        <div>
          <label htmlFor="series-slug" className="mb-1 block text-[10px] font-semibold text-muted">
            Slug
          </label>
          <input
            id="series-slug"
            className="w-full rounded-lg border border-line bg-[#121217] px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="auto-generated"
            maxLength={200}
          />
        </div>

        <div>
          <label htmlFor="series-type" className="mb-1 block text-[10px] font-semibold text-muted">
            Content Type
          </label>
          <select
            id="series-type"
            className="w-full rounded-lg border border-line bg-[#121217] px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent"
            value={contentType}
            onChange={(e) => setContentType(e.target.value as "manga" | "light_novel")}
          >
            <option value="manga">Manga</option>
            <option value="light_novel">Light Novel</option>
          </select>
        </div>

        <div>
          <label htmlFor="series-status" className="mb-1 block text-[10px] font-semibold text-muted">
            Status
          </label>
          <select
            id="series-status"
            className="w-full rounded-lg border border-line bg-[#121217] px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent"
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          >
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="series-desc" className="mb-1 block text-[10px] font-semibold text-muted">
            Description
          </label>
          <textarea
            id="series-desc"
            className="min-h-[60px] w-full resize-y rounded-lg border border-line bg-[#121217] px-2.5 py-2 text-xs text-foreground outline-none focus:border-accent"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting || !title}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-[#171a11] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {submitting ? "Creating…" : "Create Series"}
      </button>
    </form>
  );
}
