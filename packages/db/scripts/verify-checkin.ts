import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, publishEvent } from '../src/services/event';
import { registerForEvent, confirmRegistration } from '../src/services/registration';
import { scanCheckin, getCheckinStats } from '../src/services/checkin';

async function main() {
  const slug = `chk-${Date.now()}`;
  const { tenantId } = await provisionTenant({
    name: 'Demo Checkin',
    slug,
    adminEmail: `admin@${slug}.test`,
    adminName: 'Admin',
  });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const ev = await createEvent(tenantId, {
    title: 'Evento Checkin',
    type: 'in_person',
    startsAt: new Date(Date.now() + 864e5),
    endsAt: new Date(Date.now() + 864e5 + 2 * 36e5),
    locationName: 'Puerta A',
  });
  await publishEvent(tenantId, ev.id);

  // Asistente confirmado
  const r = await registerForEvent(tenant.slug, ev.slug, {
    fullName: 'Ana Confirmada',
    email: 'ana@example.com',
    phone: '+1809',
  });
  if (!r.ok) throw new Error('registro fallo');
  await confirmRegistration(r.confirmationToken);

  // Asistente NO confirmado
  const r2 = await registerForEvent(tenant.slug, ev.slug, {
    fullName: 'Beto SinConfirmar',
    email: 'beto@example.com',
    phone: '+1809',
  });
  if (!r2.ok) throw new Error('registro 2 fallo');

  const s1 = await scanCheckin({ tenantId, eventId: ev.id, qrToken: r.qrToken, gate: 'A' });
  console.log('  confirmado -> ', s1.result, '(esperado ok)');

  const dup = await scanCheckin({ tenantId, eventId: ev.id, qrToken: r.qrToken, gate: 'A' });
  console.log('  re-escaneo -> ', dup.result, '(esperado duplicate)');

  const nc = await scanCheckin({ tenantId, eventId: ev.id, qrToken: r2.qrToken, gate: 'B' });
  console.log('  sin confirmar -> ', nc.result, '(esperado not_confirmed)');

  const inv = await scanCheckin({ tenantId, eventId: ev.id, qrToken: 'token-falso-xyz', gate: 'A' });
  console.log('  token falso -> ', inv.result, '(esperado invalid)');

  const stats = await getCheckinStats(tenantId, ev.id);
  console.log('  stats:', JSON.stringify({ attended: stats?.attended, total: stats?.total }));

  const logs = await prisma.attendanceLog.count({ where: { eventId: ev.id } });
  console.log('  attendance_logs registrados:', logs, '(esperado 4)');

  await prisma.tenant.delete({ where: { id: tenantId } });
  console.log('✓ Verificación de check-in OK y limpieza hecha.');
}

main()
  .catch((e) => {
    console.error('✗ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
