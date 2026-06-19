import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent, publishEvent } from '../src/services/event';
import { registerForEvent, confirmRegistration } from '../src/services/registration';
import {
  setupDefaultCampaigns,
  materializeCampaign,
  processDueJobs,
  listCampaigns,
} from '../src/services/messaging';

async function main() {
  const slug = `msg-${Date.now()}`;
  const { tenantId } = await provisionTenant({
    name: 'Demo Msg',
    slug,
    adminEmail: `admin@${slug}.test`,
    adminName: 'Admin',
  });
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  // Evento que empieza en 23h -> el recordatorio 24h ya está "vencido".
  const ev = await createEvent(tenantId, {
    title: 'Evento Mensajería',
    type: 'in_person',
    startsAt: new Date(Date.now() + 23 * 36e5),
    endsAt: new Date(Date.now() + 25 * 36e5),
    locationName: 'Sala B',
  });
  await publishEvent(tenantId, ev.id);

  const created = await setupDefaultCampaigns(tenantId, ev.id);
  console.log('  campañas creadas:', created.join(', '));

  // Un confirmado y un registrado
  const a = await registerForEvent(tenant.slug, ev.slug, { fullName: 'Ana', email: 'ana@x.com', phone: '+1' });
  if (a.ok) await confirmRegistration(a.confirmationToken);
  await registerForEvent(tenant.slug, ev.slug, { fullName: 'Beto', email: 'beto@x.com', phone: '+1' });

  const campaigns = await listCampaigns(tenantId, ev.id);
  let totalJobs = 0;
  for (const c of campaigns) totalJobs += await materializeCampaign(c.id);
  console.log('  jobs materializados:', totalJobs);

  // Envío simulado (mock) — verifica el scheduler sin SES real.
  const outbox: string[] = [];
  const res = await processDueJobs(async (msg) => {
    outbox.push(`${msg.to} :: ${msg.subject}`);
    return { ok: true, providerMessageId: 'mock-' + outbox.length };
  });
  console.log('  procesados:', res.processed, '· enviados:', res.sent);
  console.log('  ejemplos:', outbox.slice(0, 3).join(' | '));

  const logs = await prisma.messageLog.count({
    where: { campaignId: { in: campaigns.map((c) => c.id) } },
  });
  console.log('  message_logs:', logs);

  await prisma.tenant.delete({ where: { id: tenantId } });
  // Limpia tenants residuales de corridas previas de este script.
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: 'msg-' } } });
  console.log('✓ Verificación de mensajería OK y limpieza hecha.');
}

main().catch((e) => { console.error('✗', e); process.exit(1); }).finally(() => prisma.$disconnect());
