import 'server-only';
import Stripe from 'stripe';

/** Cliente Stripe (sólo servidor). Lanza si no está configurado. PRD M11. */
let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripe) return stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurado');
  stripe = new Stripe(key);
  return stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
