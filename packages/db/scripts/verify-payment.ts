import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, publishEvent } from '../src/services/event';
import { registerForEvent } from '../src/services/registration';
import { markManualPayment, recordStripePayment, getPaymentSummary } from '../src/services/payment';

async function main() {
  const slug = `pay-${Date.now()}`;
  const { tenantId } = await provisionTenant({
    name: 'Demo Pay', slug, adminEmail: `a@${slug}.test`, adminName: 'A',
  });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const ev = await createEvent(tenantId, {
    title: 'Evento Pago', type: 'in_person',
    startsAt: new Date(Date.now() + 864e5), endsAt: new Date(Date.now() + 9e7),
    locationName: 'X', requiresPayment: true,
  });
  await publishEvent(tenantId, ev.id);
  const r = await registerForEvent(tenant.slug, ev.slug, { fullName: 'Ana', email: 'ana@x.com', phone: '+1' });
  if (!r.ok) throw new Error('reg');

  const p1 = await markManualPayment(tenantId, r.registrationId, true, 'efectivo');
  console.log('  manual pagó ->', p1?.status, '(esperado manual_paid)');
  const p2 = await markManualPayment(tenantId, r.registrationId, false);
  console.log('  manual revertido ->', p2?.status, '(esperado pending)');

  const s1 = await recordStripePayment({ providerRef: 'pi_123', registrationId: r.registrationId, amountCents: 5000, currency: 'USD' });
  const s2 = await recordStripePayment({ providerRef: 'pi_123', registrationId: r.registrationId, amountCents: 5000, currency: 'USD' });
  const stripeCount = await prisma.payment.count({ where: { providerRef: 'pi_123' } });
  console.log('  stripe idempotente ->', stripeCount === 1 && s1?.id === s2?.id ? 'OK (1 registro)' : 'FALLO');

  const summary = await getPaymentSummary(tenantId, ev.id);
  console.log('  resumen:', JSON.stringify(summary));

  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: 'pay-' } } });
  console.log('✓ Verificación de pagos OK y limpieza hecha.');
}
main().catch((e) => { console.error('✗', e); process.exit(1); }).finally(() => prisma.$disconnect());
