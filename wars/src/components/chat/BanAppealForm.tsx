"use client";

import { useEffect, useState } from "react";

type BanDetails = { reason: string; expires_at: string | null };

export function BanAppealForm() {
  const [ban, setBan] = useState<BanDetails | null>(null);
  const [pending, setPending] = useState(false);
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetch("/api/ban-appeals", { cache: "no-store" }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        setBan(data.ban ?? null);
        setPending(Boolean(data.appeal));
      } else {
        setStatus(data.error ?? "Could not load ban status");
      }
      setLoading(false);
    }).catch(() => {
      setStatus("Could not load ban status");
      setLoading(false);
    });
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    const response = await fetch("/api/ban-appeals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setStatus(data.error ?? "Could not submit appeal");
      return;
    }
    setPending(true);
    setStatus("Appeal sent to the Admin and Owner team.");
  }

  if (loading) return <p className="mt-4 text-sm text-muted">Checking chat status…</p>;
  if (!ban) return <p className="mt-4 text-sm text-muted">You do not have an active chat ban.</p>;

  return (
    <div className="mt-6 rounded-xl border border-line bg-panel p-5">
      <p className="text-sm"><span className="font-semibold">Reason:</span> {ban.reason}</p>
      <p className="mt-1 text-xs text-muted">{ban.expires_at ? `This ban expires ${new Date(ban.expires_at).toLocaleString()}.` : "This is a permanent chat ban unless an appeal is approved."}</p>
      {pending ? (
        <p className="mt-5 rounded-lg border border-line bg-panel2 p-3 text-sm">Your appeal is pending review.</p>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <label htmlFor="ban-appeal" className="block text-sm font-semibold">Submit an appeal</label>
          <textarea id="ban-appeal" value={content} onChange={(event) => setContent(event.target.value)} minLength={10} maxLength={3000} required rows={5} placeholder="Explain why you believe this ban should be reviewed." className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-accent" />
          <button type="submit" disabled={saving || content.trim().length < 10} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#171a11] disabled:opacity-50">{saving ? "Sending…" : "Send appeal"}</button>
        </form>
      )}
      {status && <p className="mt-3 text-sm text-muted" role="status">{status}</p>}
    </div>
  );
}
