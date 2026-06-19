import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBranding, getPlanUsage } from '@eventflow/db';
import { PageHeader } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { BrandingForm } from './branding-form';

export const dynamic = 'force-dynamic';

function UsageBar({ label, used, limit }: { label: string; used: number; limit?: number }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-white/60">{label}</span>
        <span className="text-white/80">
          {used}
          {limit != null ? ` / ${limit}` : ' / ∞'}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-400"
          style={{ width: `${limit ? pct : 8}%` }}
        />
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user?.tenantId) notFound();
  const [branding, plan] = await Promise.all([
    getTenantBranding(user.tenantId),
    getPlanUsage(user.tenantId),
  ]);

  return (
    <>
      <PageHeader title="Ajustes" description="Personaliza la marca de tus eventos y revisa tu plan." />
      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <h2 className="font-display mb-5 text-xl">Marca</h2>
          <BrandingForm defaults={branding} />
          <p className="mt-4 text-xs text-white/40">
            El color y el logo se aplican en las páginas públicas de tus eventos.
          </p>
        </Card>

        <Card>
          <h2 className="font-display mb-5 text-xl">Tu plan</h2>
          <div className="space-y-5">
            <UsageBar label="Eventos activos" used={plan.usage.activeEvents} limit={plan.limits.activeEvents} />
            <UsageBar label="Miembros del equipo" used={plan.usage.teamMembers} limit={plan.limits.teamMembers} />
          </div>
          {plan.limits.modules && (
            <div className="mt-6">
              <p className="mb-2 text-sm text-white/60">Módulos incluidos</p>
              <div className="flex flex-wrap gap-2">
                {plan.limits.modules.map((m) => (
                  <span key={m} className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-white/70">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
