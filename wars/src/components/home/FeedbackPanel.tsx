"use client";

import { useState } from "react";

export function FeedbackPanel() {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("sending");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, content: message }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Could not send feedback");
      setStatus("sent");
      setMessage("");
      setName("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <section
      id="feedback"
      className="mb-14 rounded-[17px] border border-line bg-panel p-6"
      aria-labelledby="feedback-title"
    >
      <span className="mb-2 block text-[9px] font-bold uppercase tracking-[2px] text-accent">
        Help WARS improve
      </span>
      <h2 id="feedback-title" className="font-heading text-[22px] font-semibold">
        Share your feedback
      </h2>
      <p className="mt-2 text-xs text-muted">
        Your message goes privately to the site owner. Please keep it
        family-friendly.
      </p>

      {status === "sent" ? (
        <div className="mt-5 rounded-xl border border-[#39452b] bg-[#22291c] px-4 py-3 text-sm text-accent">
          Thanks for your feedback!
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mt-5 grid gap-3 md:grid-cols-[minmax(170px,0.35fr)_minmax(0,1fr)_auto] md:items-end"
        >
          {status === "error" && <p className="text-xs text-pink md:col-span-full">Could not send feedback. Please try again.</p>}
          <div>
            <label
              htmlFor="feedback-name"
              className="mb-1.5 block text-xs font-semibold text-[#cbc9d0]"
            >
              Your name <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id="feedback-name"
              className="w-full rounded-[10px] border border-[#383841] bg-[#121217] px-3 py-2.5 text-[13px] text-foreground outline-none placeholder:text-[#777580] focus:border-[#8daa5a]"
              maxLength={60}
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="feedback-message"
              className="mb-1.5 block text-xs font-semibold text-[#cbc9d0]"
            >
              Feedback
            </label>
            <textarea
              id="feedback-message"
              className="min-h-[44px] w-full resize-y rounded-[10px] border border-[#383841] bg-[#121217] px-3 py-2.5 text-[13px] text-foreground outline-none placeholder:text-[#777580] focus:border-[#8daa5a]"
              maxLength={1200}
              placeholder="Share a suggestion or report a problem…"
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="h-[42px] shrink-0 rounded-[10px] bg-accent px-4 py-2.5 text-xs font-bold text-[#171a11] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending" ? "Sending…" : "Send feedback"}
          </button>
        </form>
      )}
    </section>
  );
}
