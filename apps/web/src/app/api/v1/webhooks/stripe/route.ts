import { recordStripePayment } from '@eventflow/db';
import { getStripe } from '@/lib/stripe';

/** Webhook de Stripe (idempotente). PRD/06 §6.4. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers.get('stripe-signature');
  if (!secret || !sig) return new Response('not configured', { status: 503 });

  const body = await req.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret);
  } catch {
    return new Response('invalid signature', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as {
      id: string;
      amount_total: number | null;
      currency: string | null;
      metadata?: { registrationId?: string };
    };
    const registrationId = session.metadata?.registrationId;
    if (registrationId) {
      await recordStripePayment({
        providerRef: session.id,
        registrationId,
        amountCents: session.amount_total ?? 0,
        currency: (session.currency ?? 'usd').toUpperCase(),
      });
    }
  }

  return Response.json({ received: true });
}
