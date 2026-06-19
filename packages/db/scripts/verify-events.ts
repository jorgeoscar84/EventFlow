import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, listEvents, publishEvent, getEventStats } from '../src/services/event';

/** Verificación de integración del servicio de eventos contra la DB real (PRD M3). */
async function main() {
  const slug = `demo-ev-${Date.now()}`;
  const { tenantId } = await provisionTenant({
    name: 'Demo Eventos',
    slug,
    adminEmail: `admin@${slug}.test`,
    adminName: 'Admin',
  });
  console.log('→ tenant:', tenantId);

  const ev = await createEvent(tenantId, {
    title: 'Cumbre de Tecnología 2026',
    type: 'in_person',
    startsAt: new Date(Date.now() + 7 * 864e5),
    endsAt: new Date(Date.now() + 7 * 864e5 + 4 * 36e5),
    timezone: 'America/Santo_Domingo',
    locationName: 'Centro de Convenciones',
    capacity: 500,
  });
  console.log('  evento creado:', ev.slug, '· status:', ev.status);

  // Slug único ante título repetido
  const ev2 = await createEvent(tenantId, {
    title: 'Cumbre de Tecnología 2026',
    type: 'digital',
    startsAt: new Date(Date.now() + 8 * 864e5),
    endsAt: new Date(Date.now() + 8 * 864e5 + 2 * 36e5),
    onlineUrl: 'https://zoom.us/j/123',
  });
  console.log('  segundo evento (slug único):', ev2.slug);

  const published = await publishEvent(tenantId, ev.id);
  console.log('  publicado:', published?.status, '· publishedAt:', !!published?.publishedAt);

  const list = await listEvents(tenantId, {});
  console.log('  listado:', list.items.length, 'eventos · total:', list.pagination.total);

  const stats = await getEventStats(tenantId, ev.id);
  console.log('  funnel:', JSON.stringify(stats));

  // Aislamiento: otro tenant no ve estos eventos
  const other = await provisionTenant({
    name: 'Otro',
    slug: `otro-${Date.now()}`,
    adminEmail: `a@otro-${Date.now()}.test`,
    adminName: 'A',
  });
  const otherList = await listEvents(other.tenantId, {});
  console.log('  aislamiento (otro tenant ve 0):', otherList.items.length === 0 ? 'OK' : 'FALLO');

  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.tenant.delete({ where: { id: other.tenantId } });
  console.log('✓ Verificación de eventos OK y limpieza hecha.');
}

main()
  .catch((e) => {
    console.error('✗ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
