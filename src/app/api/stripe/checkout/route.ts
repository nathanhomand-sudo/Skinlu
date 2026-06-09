import { NextResponse } from "next/server";
import { createCheckoutRecord } from "@/lib/checkout-store";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: { resultId?: string };

  try {
    body = (await request.json()) as { resultId?: string };
  } catch {
    return jsonError("json_body_required", 400);
  }

  const { resultId } = body;

  if (!resultId) {
    return jsonError("result_id_required", 400);
  }

  if (!process.env.STRIPE_PRICE_ID) {
    return jsonError("stripe_price_missing", 500);
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  let sessionUrl: string | null;

  try {
    const accessToken = createCheckoutRecord(resultId);
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      metadata: {
        resultId,
        accessToken,
      },
      success_url: `${origin}/?payment=success&result_id=${encodeURIComponent(
        resultId,
      )}&access_token=${encodeURIComponent(accessToken)}`,
      cancel_url: `${origin}/?payment=cancelled`,
    });

    sessionUrl = session.url;
  } catch (error) {
    console.error("stripe_checkout_failed", error);
    return jsonError("checkout_failed", 500);
  }

  if (!sessionUrl) {
    return jsonError("checkout_url_missing", 500);
  }

  return NextResponse.json({
    url: sessionUrl,
  });
}
