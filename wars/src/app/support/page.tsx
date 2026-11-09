"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Check, Copy, Heart } from "lucide-react";
import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";

const UPI_ID = "fictrivosoftwarelimited@oksbi";
const PAYEE_NAME = "FICTRIVO SOFTWARE LIMITED";

export default function SupportPage() {
  const [amount, setAmount] = useState("100");
  const [copied, setCopied] = useState(false);
  const parsedAmount = Number(amount);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 100000;
  const upiLink = validAmount
    ? `upi://pay?${new URLSearchParams({
        pa: UPI_ID,
        pn: PAYEE_NAME,
        am: parsedAmount.toFixed(2),
        cu: "INR",
        tn: "Support WARS",
      }).toString()}`
    : "";

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6 md:py-14">
        <div className="mx-auto max-w-2xl text-center">
          <Heart className="mx-auto h-9 w-9 text-pink" aria-hidden />
          <p className="mt-4 text-[11px] font-bold uppercase tracking-[1.5px] text-purple">Community support</p>
          <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">Support WARS</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
            WARS is free to read. Your contribution helps cover hosting and keep the community running.
          </p>
        </div>

        <section className="mx-auto mt-8 grid max-w-4xl gap-6 rounded-2xl border border-line bg-panel p-5 md:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] md:p-8">
          <div className="flex flex-col justify-center">
            <h2 className="font-heading text-xl font-semibold">Pay with GPay or any UPI app</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Choose an amount, then scan the QR from another device or open your UPI app on this phone.
            </p>

            <label htmlFor="donation-amount" className="mt-6 text-sm font-semibold">Donation amount (INR)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {[100, 500, 1000].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(String(value))}
                  aria-pressed={Number(amount) === value}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${Number(amount) === value ? "border-accent bg-accent/15 text-foreground" : "border-line bg-background text-muted hover:text-foreground"}`}
                >
                  ₹{value.toLocaleString("en-IN")}
                </button>
              ))}
            </div>
            <div className="mt-3 flex max-w-xs items-center rounded-lg border border-line bg-background px-3">
              <span className="text-sm text-muted">₹</span>
              <input
                id="donation-amount"
                type="number"
                min="1"
                max="100000"
                step="1"
                inputMode="numeric"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
              />
            </div>

            <a
              href={upiLink || undefined}
              aria-disabled={!validAmount}
              className={`mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-[#171a11] ${validAmount ? "" : "pointer-events-none opacity-50"}`}
            >
              Open GPay / UPI <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>

            <div className="mt-5 rounded-xl border border-line bg-background p-4">
              <p className="text-xs text-muted">UPI ID</p>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                <code className="break-all text-sm font-semibold">{UPI_ID}</code>
                <button
                  type="button"
                  onClick={copyUpiId}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-muted">Payee: {PAYEE_NAME}</p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[340px] rounded-2xl bg-white p-4 text-center text-slate-900">
            <Image
              src="/wars-gpay-qr.jpg"
              alt="Scan this Google Pay UPI QR code to support WARS"
              width={830}
              height={830}
              priority
              className="h-auto w-full rounded-xl"
            />
            <p className="mt-3 text-sm font-semibold">Scan with GPay or another UPI app</p>
            <p className="mt-1 text-xs text-slate-600">Enter ₹{validAmount ? parsedAmount.toLocaleString("en-IN") : "your amount"} before paying.</p>
          </div>
        </section>

        <p className="mx-auto mt-5 max-w-4xl rounded-xl border border-[#72570c]/50 bg-[#241c08] px-4 py-3 text-center text-xs leading-relaxed text-[#f4d879]">
          Direct UPI payments do not report back to WARS automatically. Keep your payment confirmation; the Donator badge is added after the Owner verifies your cumulative contributions reach the $50 USD equivalent. <Link href="/#feedback" className="font-semibold underline underline-offset-2">Send your username and transaction reference for review.</Link>
        </p>
      </main>
    </>
  );
}
