import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

// POST /api/stripe/webhook — sync subscription state + donator role
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const sub = event.data.object as Stripe.Subscription;
    const userId =
      (sub.metadata?.user_id as string | undefined) ??
      (typeof sub.customer === "string" || sub.customer.deleted
        ? undefined
        : sub.customer.metadata?.user_id);

    if (userId) {
      const customerId =
        typeof sub.customer === "string" ? sub.customer : sub.customer.id;

      const active = ["active", "trialing"].includes(sub.status);

      await admin.from("subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          status: sub.status,
          price_id: sub.items.data[0]?.price.id ?? null,
          current_period_start: sub.items.data[0]?.current_period_start
            ? new Date(sub.items.data[0].current_period_start * 1000).toISOString()
            : null,
          current_period_end: sub.items.data[0]?.current_period_end
            ? new Date(sub.items.data[0].current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: sub.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      const { data: donator } = await admin
        .from("roles")
        .select("id")
        .eq("name", "donator")
        .maybeSingle();

      if (donator) {
        if (active) {
          await admin
            .from("user_roles")
            .upsert({ user_id: userId, role_id: donator.id }, { onConflict: "user_id,role_id" });
        } else {
          await admin
            .from("user_roles")
            .delete()
            .eq("user_id", userId)
            .eq("role_id", donator.id);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
