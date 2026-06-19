import { z } from 'zod';
import { prisma } from '@eventflow/db';
import { getStripe, isStripeConfigured } from '@/lib/stripe';
import { ok, fail, handle } from '@/lib/api';

const schema = z.object({ registrationId: z.string().uuid() });

/** Crea una sesión de checkout de Stripe para un registro. PRD/06. */
export async function POST(req: Request) {
  return handle(async () => {
    if (!isStripeConfigured()) return fail(503, 'PAYMENTS_DISABLED', 'Pagos no configurados');
    const { registrationId } = schema.parse(await req.json());

    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { ticketType: true, event: { select: { title: true } } },
    });
    if (!reg) return fail(404, 'NOT_FOUND', 'Registro no encontrado');

    const amount = reg.ticketType?.priceCents ?? 0;
    if (amount <= 0) return fail(400, 'NO_AMOUNT', 'Este registro no requiere pago');

    const base = process.env.APP_BASE_URL ?? '';
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (reg.ticketType?.currency ?? 'usd').toLowerCase(),
            unit_amount: amount,
            product_data: { name: `${reg.event.title} — ${reg.ticketType?.name ?? 'Entrada'}` },
          },
        },
      ],
      metadata: { registrationId },
      success_url: `${base}/pase/${reg.qrToken}`,
      cancel_url: `${base}/pase/${reg.qrToken}`,
    });

    return ok({ url: session.url });
  });
}
