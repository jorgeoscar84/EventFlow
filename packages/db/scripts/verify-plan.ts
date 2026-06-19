import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';
import { createEvent } from '../src/services/event';
import { PlanLimitError, updateTenantBranding, getTenantBranding, getPlanUsage } from '../src/services/plan';

async function main() {
  const slug = `plan-${Date.now()}`;
  const { tenantId } = await provisionTenant({ name: 'Demo Plan', slug, adminEmail: `a@${slug}.test`, adminName: 'A' });

  // Plan Starter: activeEvents = 3
  for (let i = 1; i <= 3; i++) {
    await createEvent(tenantId, { title: `Evento ${i}`, type: 'digital', startsAt: new Date(Date.now() + 864e5), endsAt: new Date(Date.now() + 9e7), onlineUrl: 'https://x.com' });
  }
  let blocked = false;
  try {
    await createEvent(tenantId, { title: 'Evento 4', type: 'digital', startsAt: new Date(Date.now() + 864e5), endsAt: new Date(Date.now() + 9e7), onlineUrl: 'https://x.com' });
  } catch (e) {
    blocked = e instanceof PlanLimitError;
  }
  console.log('  4º evento bloqueado por plan:', blocked ? 'OK' : 'FALLO');

  await updateTenantBranding(tenantId, { accentColor: '#d946ef', displayName: 'Marca X' });
  const b = await getTenantBranding(tenantId);
  console.log('  branding:', JSON.stringify(b));

  const usage = await getPlanUsage(tenantId);
  console.log('  uso:', JSON.stringify(usage.usage), '· límite eventos:', usage.limits.activeEvents);

  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: 'plan-' } } });
  console.log('✓ Verificación de plan/branding OK.');
}
main().catch((e) => { console.error('✗', e); process.exit(1); }).finally(() => prisma.$disconnect());
