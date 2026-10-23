"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";

export default function SupportPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function donate() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.url) {
      setMessage(json.error ?? "Could not start checkout");
      setBusy(false);
      return;
    }
    window.location.href = json.url;
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <Heart className="mx-auto h-10 w-10 text-pink" aria-hidden />
        <h1 className="mt-4 font-heading text-2xl font-semibold">
          Support WARS
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          WARS is free to read and always will be. Donations cover hosting and
          keep the lights on. Supporters get the <strong>donator</strong> badge.
        </p>
        <button
          type="button"
          onClick={donate}
          disabled={busy}
          className="mt-6 rounded-[10px] bg-accent px-6 py-3 text-sm font-bold text-[#171a11] disabled:opacity-50"
        >
          {busy ? "Opening checkout..." : "Donate monthly"}
        </button>
        {message && <p className="mt-3 text-xs text-pink">{message}</p>}
      </main>
    </>
  );
}
