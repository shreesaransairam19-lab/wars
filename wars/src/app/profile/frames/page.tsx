"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { ProfileAvatar } from "@/components/auth/ProfileAvatar";
import { useAuth } from "@/features/auth/useAuth";
import { getPrimaryRole } from "@/components/auth/RoleName";
import { PROFILE_FRAMES, getLevelsForPrice } from "@/lib/profile-frames/catalog";

interface FrameOrder {
  id: string;
  frame_id: string;
  price_inr: number;
  status: "awaiting_payment" | "submitted" | "approved" | "rejected" | "cancelled";
  payment_reference: string | null;
  xp_awarded: number;
  created_at: string;
}

interface StoreData {
  ownedFrameIds: string[];
  equippedFrameId: string | null;
  orders: FrameOrder[];
  level: number;
}

interface PaymentIntent {
  order: FrameOrder;
  upiId: string;
  upiLink: string;
}

export default function ProfileFramesPage() {
  const { user, profile, roles, loading: authLoading } = useAuth();
  const [data, setData] = useState<StoreData>({ ownedFrameIds: [], equippedFrameId: null, orders: [], level: 1 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntent | null>(null);
  const [references, setReferences] = useState<Record<string, string>>({});
  const primaryRole = getPrimaryRole(roles);
  const isOwner = roles.some((role) => ["owner", "codester"].includes(role));
  const isStaff = roles.some((role) => ["owner", "codester", "admin"].includes(role));

  const loadStore = useCallback(async () => {
    const response = await fetch("/api/profile-frames", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.error ?? "Could not load the frame store");
    setData(json as StoreData);
  }, []);

  useEffect(() => {
    let active = true;
    if (!user) { setLoading(false); return () => { active = false; }; }
    void loadStore().catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "Could not load the frame store");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, loadStore]);

  async function refresh() {
    setError("");
    try { await loadStore(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not refresh the frame store"); }
  }

  async function startPurchase(frameId: string) {
    setBusy(frameId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/profile-frames", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ frameId }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (json.orderId) await loadStore();
        throw new Error(json.error ?? "Could not start this purchase");
      }
      if (json.freeClaim) {
        setPaymentIntent(null);
        setNotice(json.levelReward
          ? json.equipped === false
            ? "Anime Deity Wings unlocked! Tap Equip frame to apply it to your profile."
            : "Anime Deity Wings unlocked and equipped across your WARS profile."
          : json.equipped === false
            ? "Founder perk unlocked! Tap Equip frame to apply it to your profile."
            : "Founder perk unlocked! Your free Owner frame is equipped across your WARS profile.");
        window.dispatchEvent(new Event("wars:profile-updated"));
        await loadStore();
        return;
      }
      setPaymentIntent(json as PaymentIntent);
      await loadStore();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not start this purchase");
    } finally {
      setBusy("");
    }
  }

  function resumePayment(order: FrameOrder) {
    const upiId = "fictrivosoftwarelimited@oksbi";
    const upiLink = `upi://pay?${new URLSearchParams({ pa: upiId, am: order.price_inr.toFixed(2), cu: "INR", tn: `WARS frame ${order.id.slice(0, 8)}` }).toString()}`;
    setPaymentIntent({ order, upiId, upiLink });
  }

  async function submitReference(orderId: string) {
    setBusy(orderId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/profile-frames", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit-payment", orderId, paymentReference: references[orderId] ?? "" }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Could not submit payment reference");
      setNotice("Payment reference submitted. Your frame and level XP unlock after Owner/Admin verifies it.");
      setPaymentIntent(null);
      await loadStore();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not submit payment reference");
    } finally {
      setBusy("");
    }
  }

  async function cancelOrder(orderId: string) {
    setBusy(orderId); setError("");
    try {
      const response = await fetch("/api/profile-frames", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "cancel", orderId }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Could not cancel order");
      setPaymentIntent(null);
      await loadStore();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not cancel order");
    } finally {
      setBusy("");
    }
  }

  async function equip(frameId: string) {
    setBusy(frameId); setError(""); setNotice("");
    try {
      const response = await fetch("/api/profile-frames", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "equip", frameId }) });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Could not equip this frame");
      setData((current) => ({ ...current, equippedFrameId: frameId }));
      window.dispatchEvent(new Event("wars:profile-updated"));
      setNotice("Frame equipped across your WARS profile.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not equip this frame");
    } finally {
      setBusy("");
    }
  }

  if (authLoading || (user && loading)) return <><TopBar /><main className="mx-auto max-w-5xl px-4 py-12"><div className="h-56 animate-pulse rounded-2xl bg-panel" /></main></>;
  if (!user) return <><TopBar /><main className="mx-auto max-w-lg px-4 py-20 text-center"><Sparkles className="mx-auto h-9 w-9 text-accent" /><h1 className="mt-4 font-heading text-2xl font-semibold">Sign in to unlock the frame store</h1><p className="mt-2 text-sm text-muted">Every WARS member can collect and equip profile frames.</p><Link href="/login?next=/profile/frames" className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-[#171a11]">Sign in</Link></main></>;

  const displayName = profile?.display_name || profile?.username || "Reader";
  const activeOrder = (frameId: string) => data.orders.find((order) => order.frame_id === frameId && ["awaiting_payment", "submitted"].includes(order.status));

  return <>
    <TopBar />
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <Link href="/profile" className="mb-5 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Profile</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[11px] font-bold uppercase tracking-[1.5px] text-purple">WARS style shop</p><h1 className="mt-1 font-heading text-3xl font-semibold tracking-tight">Profile Frame Store</h1><p className="mt-2 max-w-2xl text-sm text-muted">Owners can claim frames free. Other members pay with UPI and submit the transaction reference for manual verification. Every ₹100 earns enough XP for one level after approval.</p></div>
        <div className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-3"><ProfileAvatar userId={user.id} avatarPath={profile?.avatar_path} name={displayName} role={primaryRole} frameId={data.equippedFrameId ?? profile?.equipped_frame_id} size={44} /><div><p className="text-xs font-semibold">Your profile</p><p className="text-[11px] text-muted">Preview updates everywhere</p></div></div>
      </div>
      {isStaff && <Link href="/admin/frames" className="mt-5 inline-flex rounded-lg border border-line bg-panel px-3 py-2 text-sm text-muted hover:text-foreground">Review frame payments</Link>}
      {error && <p role="alert" className="mt-5 rounded-lg border border-[#704044] bg-[#332329] px-3 py-2 text-sm text-[#ffb2b2]">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-lg border border-[#41613a] bg-[#1b2a20] px-3 py-2 text-sm text-[#b8f28a]">{notice}</p>}

      <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Available profile frames">
        {PROFILE_FRAMES.map((frame) => {
          const owned = data.ownedFrameIds.includes(frame.id);
          const equipped = data.equippedFrameId === frame.id;
          const order = activeOrder(frame.id);
          const isLevelReward = frame.unlockLevel !== null;
          const levelUnlocked = !frame.unlockLevel || data.level >= frame.unlockLevel;
          return <article key={frame.id} className="flex flex-col rounded-2xl border border-line bg-panel p-5">
            <div className="flex items-center gap-4"><ProfileAvatar name="WARS" role="reader" frameId={frame.id} size={64} /><div><h2 className="font-heading text-lg font-semibold">{frame.name}</h2><p className="text-sm font-bold text-accent">{isLevelReward ? `LEVEL ${frame.unlockLevel} REWARD` : isOwner ? "FREE · OWNER FOUNDER PERK" : `₹${frame.priceInr.toLocaleString("en-IN")}${"exclusive" in frame && frame.exclusive ? " · EXCLUSIVE" : ""}`}</p></div></div>
            <p className="mt-4 min-h-10 text-sm text-muted">{frame.description}</p>
            <p className="mt-3 text-xs text-accent">{isLevelReward ? `Unlocks at Level ${frame.unlockLevel} · your level: ${data.level}` : isOwner ? "Founder perk · Free claims do not add purchase XP" : `+${getLevelsForPrice(frame.priceInr)} level's worth of XP after verification`}</p>
            <div className="mt-5">{owned ? <button type="button" onClick={() => void equip(frame.id)} disabled={equipped || Boolean(busy)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{equipped ? <><Check className="h-4 w-4" /> Equipped</> : busy === frame.id ? "Saving…" : "Equip frame"}</button> : order?.status === "submitted" ? <p className="rounded-lg border border-line bg-background px-3 py-2.5 text-center text-sm text-muted">Payment submitted · awaiting review</p> : isLevelReward && !levelUnlocked ? <button type="button" disabled className="w-full rounded-lg border border-line px-4 py-2.5 text-sm text-muted disabled:opacity-60">Unlock at Level {frame.unlockLevel}</button> : isLevelReward ? <button type="button" onClick={() => void startPurchase(frame.id)} disabled={Boolean(busy)} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11] disabled:opacity-50">{busy === frame.id ? "Unlocking…" : "Claim Level 100 reward"}</button> : isOwner ? <button type="button" onClick={() => void startPurchase(frame.id)} disabled={Boolean(busy)} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11] disabled:opacity-50">{busy === frame.id ? "Unlocking…" : "Claim free Owner frame"}</button> : order?.status === "awaiting_payment" ? <button type="button" onClick={() => resumePayment(order)} className="w-full rounded-lg border border-accent/60 px-4 py-2.5 text-sm font-semibold text-accent">Continue payment</button> : <button type="button" onClick={() => void startPurchase(frame.id)} disabled={Boolean(busy)} className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11] disabled:opacity-50">{busy === frame.id ? "Preparing…" : "Buy frame"}</button>}</div>
          </article>;
        })}
      </section>

      {paymentIntent && <section className="mt-7 rounded-2xl border border-accent/50 bg-panel p-5" aria-labelledby="upi-order-title">
        <h2 id="upi-order-title" className="font-heading text-lg font-semibold">Finish your {PROFILE_FRAMES.find((frame) => frame.id === paymentIntent.order.frame_id)?.name} order</h2>
        <p className="mt-1 text-sm text-muted">Pay exactly ₹{paymentIntent.order.price_inr.toLocaleString("en-IN")} using GPay or another UPI app. The frame and XP are granted only after payment is verified.</p>
        <p className="mt-3 text-xs text-muted">UPI ID</p><code className="text-sm font-semibold">{paymentIntent.upiId}</code>
        <div className="mt-4 flex flex-wrap gap-3"><a href={paymentIntent.upiLink} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-[#171a11]">Open GPay / UPI <ExternalLink className="h-4 w-4" /></a><button type="button" onClick={() => void cancelOrder(paymentIntent.order.id)} disabled={busy === paymentIntent.order.id} className="rounded-lg border border-line px-4 py-2.5 text-sm text-muted hover:text-foreground">Cancel order</button></div>
        <p className="mt-3 text-xs text-muted">WARS cannot verify UPI transfers automatically. Once paid, submit the UTR below.</p>
      </section>}

      {data.orders.some((order) => order.status === "awaiting_payment") && <section className="mt-7 rounded-2xl border border-line bg-panel p-5" aria-labelledby="upi-reference-title">
        <div className="flex items-start justify-between gap-4"><div><h2 id="upi-reference-title" className="font-heading text-lg font-semibold">Payment reference</h2><p className="mt-1 text-sm text-muted">After paying, enter the UTR or transaction reference shown in your UPI app.</p></div><button type="button" onClick={() => void refresh()} aria-label="Refresh orders" className="rounded-lg border border-line p-2 text-muted hover:text-foreground"><RefreshCw className="h-4 w-4" /></button></div>
        <div className="mt-4 space-y-4">{data.orders.filter((order) => order.status === "awaiting_payment").map((order) => <div key={order.id} className="rounded-xl border border-line bg-background p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{PROFILE_FRAMES.find((frame) => frame.id === order.frame_id)?.name} · ₹{order.price_inr}</p><p className="text-xs text-muted">Order {order.id.slice(0, 8)}</p></div><label htmlFor={`utr-${order.id}`} className="mt-3 block text-xs font-semibold">UPI transaction reference / UTR</label><div className="mt-1 flex flex-wrap gap-2"><input id={`utr-${order.id}`} value={references[order.id] ?? ""} onChange={(event) => setReferences((current) => ({ ...current, [order.id]: event.target.value }))} minLength={6} maxLength={64} autoComplete="off" className="min-w-[220px] flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Enter payment reference" /><button type="button" onClick={() => void submitReference(order.id)} disabled={busy === order.id || (references[order.id] ?? "").trim().length < 6} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-[#171a11] disabled:opacity-50">{busy === order.id ? "Sending…" : "I paid · Submit reference"}</button></div><p className="mt-2 text-[11px] text-muted">Submitting a reference does not immediately grant the frame or XP. WARS staff check the payment first.</p></div>)}</div>
      </section>}

      {data.orders.some((order) => ["submitted", "approved", "rejected", "cancelled"].includes(order.status)) && <section className="mt-7 rounded-2xl border border-line bg-panel p-5"><h2 className="font-heading text-lg font-semibold">Order history</h2><ul className="mt-3 divide-y divide-line">{data.orders.filter((order) => ["submitted", "approved", "rejected", "cancelled"].includes(order.status)).map((order) => <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><span>{PROFILE_FRAMES.find((frame) => frame.id === order.frame_id)?.name} · ₹{order.price_inr}</span><span className="text-xs capitalize text-muted">{order.status === "approved" ? `Verified · ${order.xp_awarded} XP awarded` : order.status === "submitted" ? "Submitted · waiting for verification" : order.status}</span></li>)}</ul></section>}
    </main>
  </>;
}
