import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, publishEvent } from '../src/services/event';
import { registerForEvent, confirmRegistration } from '../src/services/registration';
import { markManualPayment } from '../src/services/payment';
import { listRegistrations, buildExport, toCsv } from '../src/services/report';

async function main() {
  const slug = `rep-${Date.now()}`;
  const { tenantId } = await provisionTenant({ name: 'Demo Rep', slug, adminEmail: `a@${slug}.test`, adminName: 'A' });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const ev = await createEvent(tenantId, {
    title: 'Evento Reporte', type: 'in_person',
    startsAt: new Date(Date.now() + 864e5), endsAt: new Date(Date.now() + 9e7), locationName: 'X',
  });
  await prisma.customField.create({ data: { eventId: ev.id, key: 'provincia', label: 'Provincia', type: 'text', required: false, order: 1 } });
  await publishEvent(tenantId, ev.id);

  const a = await registerForEvent(tenant.slug, ev.slug, { fullName: 'Ana Pérez', email: 'ana@x.com', phone: '+1', customFields: { provincia: 'Santo Domingo' } });
  if (a.ok) { await confirmRegistration(a.confirmationToken); await markManualPayment(tenantId, a.registrationId, true); }
  await registerForEvent(tenant.slug, ev.slug, { fullName: 'Beto Gómez', email: 'beto@x.com', phone: '+2', customFields: { provincia: 'Santiago' } });

  const list = await listRegistrations(tenantId, ev.id, {});
  console.log('  registros:', list?.items.length, '· columnas personalizadas:', list?.customFields.map((c) => c.label).join(','));
  console.log('  ejemplo fila:', JSON.stringify({ name: list?.items[0]?.fullName, paid: list?.items[0]?.paid, fields: list?.items[0]?.fields }));

  const paidOnly = await listRegistrations(tenantId, ev.id, { paid: 'paid' });
  console.log('  filtro pagó:', paidOnly?.items.length, '(esperado 1)');

  const exp = await buildExport(tenantId, ev.id);
  const csv = exp ? toCsv(exp.columns, exp.rows) : '';
  console.log('  export columnas:', exp?.columns.join(' | '));
  console.log('  export filas:', exp?.rows.length);
  console.log('  CSV primera línea de datos:', csv.split('\n')[1]);

  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: 'rep-' } } });
  console.log('✓ Verificación de reportes OK y limpieza hecha.');
}
main().catch((e) => { console.error('✗', e); process.exit(1); }).finally(() => prisma.$disconnect());
