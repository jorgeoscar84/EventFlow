import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, publishEvent } from '../src/services/event';
import { registerForEvent, confirmRegistration, getPublicEvent } from '../src/index';

async function main() {
  const slug = `reg-${Date.now()}`;
  const { tenantId } = await provisionTenant({
    name: 'Demo Reg',
    slug,
    adminEmail: `admin@${slug}.test`,
    adminName: 'Admin',
  });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  const ev = await createEvent(tenantId, {
    title: 'Evento de Registro',
    type: 'in_person',
    startsAt: new Date(Date.now() + 5 * 864e5),
    endsAt: new Date(Date.now() + 5 * 864e5 + 2 * 36e5),
    locationName: 'Sala A',
    capacity: 1,
  });
  await publishEvent(tenantId, ev.id);

  const r1 = await registerForEvent(tenant.slug, ev.slug, {
    fullName: 'Ana Pérez',
    email: 'ana@example.com',
    phone: '+18095551234',
    consentMarketing: true,
  });
  console.log('  registro 1:', r1.ok && r1.status, '· nuevo:', r1.ok && !r1.alreadyRegistered);

  const dup = await registerForEvent(tenant.slug, ev.slug, {
    fullName: 'Ana Pérez',
    email: 'ana@example.com',
    phone: '+18095551234',
  });
  console.log('  dedupe (mismo email):', dup.ok && dup.alreadyRegistered ? 'OK' : 'FALLO');

  const r2 = await registerForEvent(tenant.slug, ev.slug, {
    fullName: 'Beto Gómez',
    email: 'beto@example.com',
    phone: '+18095555678',
  });
  console.log('  aforo lleno -> lista de espera:', r2.ok && r2.status === 'waitlist' ? 'OK' : 'FALLO');

  if (r1.ok) {
    const reg = await prisma.registration.findUniqueOrThrow({ where: { id: r1.registrationId } });
    const confirmed = await confirmRegistration(reg.confirmationToken);
    console.log('  confirmación:', confirmed?.status === 'confirmed' ? 'OK' : 'FALLO');
  }

  const pub = await getPublicEvent(tenant.slug, ev.slug);
  console.log('  página pública: registrados =', pub?.registeredCount);

  await prisma.tenant.delete({ where: { id: tenantId } });
  console.log('✓ Verificación de registro OK y limpieza hecha.');
}

main()
  .catch((e) => {
    console.error('✗ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
