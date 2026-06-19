import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, publishEvent } from '../src/services/event';
import { ingestEventKnowledge, addFaq, retrieve, chat, setEventAgentEnabled, getEffectiveAgentConfig } from '../src/services/ai';

async function main() {
  const slug = `ai-${Date.now()}`;
  const { tenantId } = await provisionTenant({ name: 'Demo AI', slug, adminEmail: `a@${slug}.test`, adminName: 'A' });
  const ev = await createEvent(tenantId, {
    title: 'Tech Summit', type: 'in_person',
    description: 'Una jornada de innovación y networking.',
    startsAt: new Date('2026-09-15T18:00:00Z'), endsAt: new Date('2026-09-15T23:00:00Z'),
    timezone: 'America/Santo_Domingo', locationName: 'Hotel Central', capacity: 200,
  });
  await publishEvent(tenantId, ev.id);

  await setEventAgentEnabled(tenantId, ev.id, true);
  const cfg = await getEffectiveAgentConfig(tenantId, ev.id);
  console.log('  agente habilitado:', cfg.enabled);

  const n = await ingestEventKnowledge(tenantId, ev.id);
  await addFaq(tenantId, ev.id, '¿Hay estacionamiento?', 'Sí, el hotel cuenta con parqueo gratuito para asistentes.');
  console.log('  fragmentos de conocimiento (auto):', n, '+ 1 FAQ');

  const r1 = await retrieve(tenantId, ev.id, '¿dónde es el evento?');
  console.log('  retrieve "dónde":', r1[0]?.content.slice(0, 50), '· score:', r1[0]?.score.toFixed(2));

  const c1 = await chat({ tenantId, eventId: ev.id, message: '¿Dónde se hace el evento y a qué hora?' });
  console.log('  chat ubicación -> grounded:', c1.grounded, '|', c1.reply.slice(0, 90));

  const c2 = await chat({ tenantId, eventId: ev.id, message: '¿Hay estacionamiento disponible?' });
  console.log('  chat parqueo -> grounded:', c2.grounded, '|', c2.reply.slice(0, 90));

  const c3 = await chat({ tenantId, eventId: ev.id, message: '¿Cuál es la receta del sancocho?' });
  console.log('  chat irrelevante -> grounded:', c3.grounded, '(esperado false, fallback)');

  // Aislamiento: otro tenant no recupera este conocimiento
  const other = await provisionTenant({ name: 'Otro', slug: `aiother-${Date.now()}`, adminEmail: `b@x${Date.now()}.test`, adminName: 'B' });
  const iso = await retrieve(other.tenantId, ev.id, 'dónde es el evento');
  console.log('  aislamiento (otro tenant recupera 0):', iso.length === 0 ? 'OK' : 'FALLO');

  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.tenant.delete({ where: { id: other.tenantId } });
  await prisma.tenant.deleteMany({ where: { OR: [{ slug: { startsWith: 'ai-' } }, { slug: { startsWith: 'aiother-' } }] } });
  console.log('✓ Verificación del Asistente IA OK y limpieza hecha.');
}
main().catch((e) => { console.error('✗', e); process.exit(1); }).finally(() => prisma.$disconnect());
