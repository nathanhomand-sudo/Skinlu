import { NextResponse } from "next/server";
import { attachCheckoutEmail } from "@/lib/checkout-store";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  let body: { sessionToken?: string; email?: string };

  try {
    body = (await request.json()) as { sessionToken?: string; email?: string };
  } catch {
    return jsonError("json_body_required", 400);
  }

  const { sessionToken } = body;
  const email = body.email?.trim() || null;

  if (!sessionToken) {
    return jsonError("session_token_required", 400);
  }

  if (!process.env.STRIPE_PRICE_ID) {
    return jsonError("stripe_price_missing", 500);
  }

  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  let sessionUrl: string | null;

  try {
    const supabase = getSupabaseAdmin();
    const { data: diagnostic, error: diagnosticError } = await supabase
      .from("diagnostics")
      .select("id")
      .eq("session_token", sessionToken)
      .maybeSingle();

    if (diagnosticError) {
      throw new Error(`diagnostic_query_failed: ${diagnosticError.message}`);
    }

    if (!diagnostic) {
      return jsonError("diagnostic_not_found", 404);
    }

    await attachCheckoutEmail(sessionToken, email);

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      customer_email: email ?? undefined,
      metadata: {
        sessionToken,
      },
      success_url: `${origin}/routine/${encodeURIComponent(sessionToken)}`,
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
