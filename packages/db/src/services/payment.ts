import { prisma } from '../index';

/** Resumen de pagos de un evento (PRD M11). */
export async function getPaymentSummary(tenantId: string, eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId }, select: { id: true } });
  if (!event) return null;
  const grouped = await prisma.payment.groupBy({
    by: ['status'],
    where: { eventId, tenantId },
    _count: { _all: true },
    _sum: { amountCents: true },
  });
  const paidStatuses = ['paid', 'manual_paid'];
  const revenueCents = grouped
    .filter((g) => paidStatuses.includes(g.status))
    .reduce((acc, g) => acc + (g._sum.amountCents ?? 0), 0);
  return {
    revenueCents,
    byStatus: Object.fromEntries(grouped.map((g) => [g.status, g._count._all])),
  };
}

/** Control manual: marca un registro como pagado / no pagado (PRD M11). */
export async function markManualPayment(
  tenantId: string,
  registrationId: string,
  paid: boolean,
  notes?: string,
) {
  const reg = await prisma.registration.findFirst({
    where: { id: registrationId, tenantId },
    include: { ticketType: true },
  });
  if (!reg) return null;

  const amountCents = reg.ticketType?.priceCents ?? 0;
  const currency = reg.ticketType?.currency ?? 'USD';
  const existing = await prisma.payment.findFirst({
    where: { registrationId, provider: 'manual' },
  });

  if (existing) {
    return prisma.payment.update({
      where: { id: existing.id },
      data: {
        status: paid ? 'manual_paid' : 'pending',
        paidAt: paid ? new Date() : null,
        notes: notes ?? existing.notes,
      },
    });
  }

  return prisma.payment.create({
    data: {
      tenantId,
      eventId: reg.eventId,
      registrationId,
      amountCents,
      currency,
      provider: 'manual',
      status: paid ? 'manual_paid' : 'pending',
      paidAt: paid ? new Date() : null,
      notes: notes ?? null,
    },
  });
}

/** Registra un pago de Stripe de forma idempotente (webhook). PRD M11. */
export async function recordStripePayment(input: {
  providerRef: string;
  registrationId: string;
  amountCents: number;
  currency: string;
}) {
  const existing = await prisma.payment.findFirst({ where: { providerRef: input.providerRef } });
  if (existing) return existing; // idempotente

  const reg = await prisma.registration.findUnique({
    where: { id: input.registrationId },
    select: { tenantId: true, eventId: true },
  });
  if (!reg) return null;

  return prisma.payment.create({
    data: {
      tenantId: reg.tenantId,
      eventId: reg.eventId,
      registrationId: input.registrationId,
      amountCents: input.amountCents,
      currency: input.currency,
      provider: 'stripe',
      providerRef: input.providerRef,
      status: 'paid',
      paidAt: new Date(),
    },
  });
}
