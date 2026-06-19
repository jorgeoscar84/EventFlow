import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, publishEvent } from '../src/services/event';

/** Crea (idempotente) un tenant "demo" con un evento publicado para previsualizar el diseño. */
async function main() {
  let tenant = await prisma.tenant.findUnique({ where: { slug: 'demo' } });
  if (!tenant) {
    const r = await provisionTenant({
      name: 'Studio Demo',
      slug: 'demo',
      adminEmail: 'demo-admin@eventflow.app',
      adminName: 'Demo Admin',
    });
    tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: r.tenantId } });
  }

  let event = await prisma.event.findFirst({
    where: { tenantId: tenant.id, slug: 'summit-2026' },
  });
  if (!event) {
    event = await createEvent(tenant.id, {
      title: 'Future Summit 2026',
      type: 'in_person',
      description:
        'Un día para reimaginar lo que viene: charlas, conexiones y experiencias en un solo lugar. Cupos limitados.',
      startsAt: new Date(Date.now() + 21 * 864e5),
      endsAt: new Date(Date.now() + 21 * 864e5 + 8 * 36e5),
      timezone: 'America/Santo_Domingo',
      locationName: 'Centro de Convenciones, Santo Domingo',
      capacity: 300,
    });
    await prisma.customField.create({
      data: {
        eventId: event.id,
        key: 'provincia',
        label: 'Provincia',
        type: 'text',
        required: false,
        order: 1,
      },
    });
    await publishEvent(tenant.id, event.id);
  }

  console.log('✓ Demo listo: /o/demo/summit-2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
