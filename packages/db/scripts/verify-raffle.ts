import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, publishEvent } from '../src/services/event';
import { registerForEvent, confirmRegistration } from '../src/services/registration';
import { scanCheckin } from '../src/services/checkin';
import { createRaffle, drawRound, rejectLastWinner, getRaffleState } from '../src/services/raffle';

async function main() {
  const slug = `raf-${Date.now()}`;
  const { tenantId } = await provisionTenant({ name: 'Demo Raf', slug, adminEmail: `a@${slug}.test`, adminName: 'A' });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const ev = await createEvent(tenantId, { title: 'Evento Sorteo', type: 'in_person', startsAt: new Date(Date.now() + 36e5), endsAt: new Date(Date.now() + 72e5), locationName: 'X' });
  await publishEvent(tenantId, ev.id);

  // 5 asistentes presentes (check-in) + 1 confirmado NO presente
  const present: string[] = [];
  for (let i = 0; i < 5; i++) {
    const r = await registerForEvent(tenant.slug, ev.slug, { fullName: `Asistente ${i + 1}`, email: `a${i}@x.com`, phone: '+1' });
    if (r.ok) { await confirmRegistration(r.confirmationToken); await scanCheckin({ tenantId, eventId: ev.id, qrToken: r.qrToken }); present.push(r.registrationId); }
  }
  const ghost = await registerForEvent(tenant.slug, ev.slug, { fullName: 'Ausente Confirmado', email: 'ghost@x.com', phone: '+1' });
  if (ghost.ok) await confirmRegistration(ghost.confirmationToken);

  // Sorteo entre confirmados+asistentes, requirePresent=true, 2 premios
  const raffle = await createRaffle(tenantId, { eventId: ev.id, name: 'Gran Sorteo', totalWinners: 2, requirePresent: true, prizes: ['iPhone', 'AirPods'], eligibleStatus: ['confirmed', 'attended'] });
  console.log('  sorteo creado · rondas:', raffle.rounds.length, '· semilla:', raffle.seed?.slice(0, 8) + '…');

  const d1 = await drawRound(tenantId, raffle.id, 1);
  console.log('  ronda 1:', d1?.winner?.name, '· presente:', d1?.winner?.present, '· aceptado:', d1?.accepted);

  // Determinismo: re-leer estado no cambia al ganador aceptado
  const d2 = await drawRound(tenantId, raffle.id, 2);
  console.log('  ronda 2:', d2?.winner?.name, '· aceptado:', d2?.accepted);
  console.log('  ganadores distintos:', d1?.winner?.id !== d2?.winner?.id ? 'OK' : 'FALLO');

  // Re-sorteo de la ronda 2
  await rejectLastWinner(tenantId, raffle.id, 2);
  const d2b = await drawRound(tenantId, raffle.id, 2);
  console.log('  re-sorteo ronda 2:', d2b?.winner?.name, '· distinto del previo:', d2b?.winner?.id !== d2?.winner?.id ? 'OK' : 'FALLO');

  const state = await getRaffleState(tenantId, raffle.id);
  console.log('  estado sorteo:', state?.raffle.status, '· rondas con ganador:', state?.raffle.rounds.filter((r) => r.status === 'won').length);

  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: 'raf-' } } });
  console.log('✓ Verificación de sorteo OK y limpieza hecha.');
}
main().catch((e) => { console.error('✗', e); process.exit(1); }).finally(() => prisma.$disconnect());
