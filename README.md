# Skinlu

Next.js MVP for AI-based skincare diagnostics, personalized routines, and
multi-brand product recommendations with one-time Stripe Checkout unlock.

## Environment

Copy `.env.example` to `.env.local` and fill:

```bash
OPENAI_API_KEY=
OPENAI_VISION_MODEL=gpt-4.1-mini
BLOB_READ_WRITE_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

`STRIPE_PRICE_ID` must be a one-time payment Price, for example a 9.99 EUR price created in Stripe test mode.

## Supabase

Create a Supabase project, then run `supabase/schema.sql` in the SQL editor.
The `products` table is intentionally empty. Add real FR products and affiliate
links manually before expecting product recommendations to appear.

## Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Test Stripe Webhooks Locally

Install and log in to the Stripe CLI, then run this in a separate terminal while the Next.js dev server is running:

```bash
stripe listen --events checkout.session.completed --forward-to localhost:3000/api/stripe/webhook
```

Stripe prints a webhook signing secret starting with `whsec_`. Put that value in `.env.local` as:

```bash
STRIPE_WEBHOOK_SECRET=whsec_...
```

Restart `npm run dev` after changing `.env.local`.

To test the full payment flow, click the report unlock button and use Stripe test card `4242 4242 4242 4242`, any future expiry date, any CVC, and any postal code. The `checkout.session.completed` event should appear in the Stripe CLI terminal and the app should unlock the report after redirect.

References:

- Stripe CLI local forwarding: https://docs.stripe.com/stripe-cli/use-cli
- Stripe Checkout fulfillment/webhook testing: https://docs.stripe.com/checkout/fulfillment
