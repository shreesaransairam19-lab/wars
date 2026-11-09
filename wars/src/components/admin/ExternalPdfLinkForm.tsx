"use client";

import { useState, type FormEvent } from "react";
import { Link2 } from "lucide-react";

interface ExternalPdfLinkFormProps {
  chapterId: string;
  onAdded: () => void;
}

export function ExternalPdfLinkForm({ chapterId, onAdded }: ExternalPdfLinkFormProps) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function addLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/chapters/${chapterId}/assets/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not add PDF link");
      setUrl("");
      setMessage("PDF link added.");
      onAdded();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add PDF link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="mt-2 rounded-lg border border-line bg-panel px-3 py-2">
      <summary className="cursor-pointer text-[10px] font-semibold text-muted hover:text-foreground">
        <span className="inline-flex items-center gap-1.5"><Link2 className="h-3 w-3" /> Add external PDF link</span>
      </summary>
      <form onSubmit={addLink} className="mt-2 flex flex-wrap gap-2">
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://… direct public PDF link"
          aria-label="External PDF URL"
          required
          maxLength={2048}
          className="min-w-0 flex-1 rounded-md border border-line bg-panel2 px-2.5 py-2 text-[10px] text-foreground outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="rounded-md bg-accent px-3 py-2 text-[10px] font-bold text-[#171a11] disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add link"}
        </button>
      </form>
      <p className="mt-1 text-[9px] text-muted">
        Use a public HTTPS link to the PDF. The file stays on its original host.
      </p>
      {message && <p role="status" className="mt-1 text-[10px] text-muted">{message}</p>}
    </details>
  );
}
