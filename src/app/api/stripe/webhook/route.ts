import { NextResponse } from "next/server";
import Stripe from "stripe";
import { markCheckoutRecordPaid } from "@/lib/checkout-store";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "stripe_webhook_secret_missing" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "signature_missing" }, { status: 400 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (error) {
    console.error("stripe_webhook_signature_failed", error);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const accessToken = session.metadata?.accessToken;

    if (accessToken) {
      markCheckoutRecordPaid(accessToken, session.id);
    }
  }

  return NextResponse.json({ received: true });
}
