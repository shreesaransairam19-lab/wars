"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { useAuth } from "@/features/auth/useAuth";
import { PROFILE_FRAMES, getLevelsForPrice } from "@/lib/profile-frames/catalog";

interface Order {
  id: string;
  user_id: string;
  frame_id: string;
  price_inr: number;
  status: string;
  payment_reference: string | null;
  xp_awarded: number;
  created_at: string;
  submitted_at: string | null;
  profile: { username: string; display_name: string | null } | null;
}

export default function AdminFramesPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const allowed = roles.some((role) => ["owner", "codester", "admin"].includes(role));
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrders = useCallback(async () => {
    const response = await fetch("/api/admin/profile-frames", { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Could not load frame purchase requests");
    setOrders(data.orders ?? []);
  }, []);

  useEffect(() => {
    if (!user || !allowed) { setLoading(false); return; }
    let active = true;
    void loadOrders().catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load frame purchase requests");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, allowed, loadOrders]);

  async function review(orderId: string, action: "approve" | "reject") {
    const order = orders.find((item) => item.id === orderId);
    if (!order) return;
    const decision = action === "approve"
      ? `Verify ₹${order.price_inr} payment and grant ${PROFILE_FRAMES.find((frame) => frame.id === order.frame_id)?.name} + XP? Check the UTR against your UPI statement first.`
      : "Reject this frame purchase request?";
    if (!window.confirm(decision)) return;
    setBusy(orderId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/admin/profile-frames", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, action }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? "Could not review this order");
      setNotice(action === "approve" ? `Payment approved. ${result.xp_awarded ?? 0} XP granted.` : "Payment request rejected.");
      await loadOrders();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not review this order");
    } finally {
      setBusy("");
    }
  }

  return <>
    <TopBar />
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <Link href="/admin/content" className="text-sm text-muted hover:text-foreground">← Content Management</Link>
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[1.5px] text-purple">Owner / Admin</p>
      <h1 className="mt-1 font-heading text-2xl font-semibold">Frame payment review</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">UPI transfers are checked manually. Verify the amount and reference in the receiving account before approving; approval grants the frame and its XP reward in one transaction.</p>

      {error && <p role="alert" className="mt-5 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-lg border border-[#41613a] bg-[#1b2a20] px-3 py-2 text-sm text-[#b8f28a]">{notice}</p>}
      {authLoading || loading ? <div className="mt-6 h-40 animate-pulse rounded-xl bg-panel" /> : !user || !allowed ? (
        <div className="mt-6 rounded-xl border border-line bg-panel p-6 text-center"><h2 className="font-heading text-lg font-semibold">Owner or Admin access required</h2><p className="mt-2 text-sm text-muted">Sign in with an account that has one of these roles.</p></div>
      ) : orders.filter((order) => order.status === "submitted").length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-line bg-panel p-8 text-center text-sm text-muted">No submitted frame payments to review.</div>
      ) : (
        <ul className="mt-6 space-y-3">{orders.filter((order) => order.status === "submitted").map((order) => {
          const frame = PROFILE_FRAMES.find((item) => item.id === order.frame_id);
          return <li key={order.id} className="rounded-xl border border-line bg-panel p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="font-heading text-lg font-semibold">{frame?.name ?? order.frame_id}</h2><p className="mt-1 text-sm">{order.profile?.display_name || order.profile?.username || "Member"} <span className="text-muted">@{order.profile?.username ?? "unknown"}</span></p><p className="mt-2 text-sm font-bold text-accent">₹{order.price_inr.toLocaleString("en-IN")} · {getLevelsForPrice(order.price_inr)} level{getLevelsForPrice(order.price_inr) === 1 ? "" : "s"} worth of XP if approved</p></div>
              <div className="rounded-lg border border-line bg-background px-3 py-2"><p className="text-[10px] uppercase tracking-wide text-muted">UPI reference</p><code className="break-all text-sm font-semibold">{order.payment_reference ?? "Missing"}</code></div>
            </div>
            <p className="mt-3 text-xs text-muted">Submitted {order.submitted_at ? new Date(order.submitted_at).toLocaleString() : new Date(order.created_at).toLocaleString()}</p>
            <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => void review(order.id, "approve")} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-[#171a11] disabled:opacity-50">{busy === order.id ? "Saving…" : "Verify & approve"}</button><button type="button" disabled={Boolean(busy)} onClick={() => void review(order.id, "reject")} className="rounded-lg border border-[#704044] px-4 py-2 text-sm font-semibold text-[#ffb2b2] disabled:opacity-50">Reject</button></div>
          </li>;
        })}</ul>
      )}
    </main>
  </>;
}
