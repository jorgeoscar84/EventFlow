import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getTenantBranding, getPlanUsage, getTenantLlmConfig } from '@eventflow/db';
import { PageHeader } from '@/components/app-shell';
import { Card } from '@/components/ui/card';
import { BrandingForm } from './branding-form';
import { LlmForm } from './llm-form';

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

  const [branding, plan, llmCfg] = await Promise.all([
    getTenantBranding(user.tenantId),
    getPlanUsage(user.tenantId),
    getTenantLlmConfig(user.tenantId),
  ]);

  return (
    <>
      <PageHeader
        title="Ajustes"
        description="Configura la marca, el plan y la inteligencia artificial de tus eventos."
      />
      <div className="space-y-8">
        {/* Fila 1: Marca + Plan */}
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
              <UsageBar
                label="Eventos activos"
                used={plan.usage.activeEvents}
                limit={plan.limits.activeEvents}
              />
              <UsageBar
                label="Miembros del equipo"
                used={plan.usage.teamMembers}
                limit={plan.limits.teamMembers}
              />
            </div>
            {plan.limits.modules && (
              <div className="mt-6">
                <p className="mb-2 text-sm text-white/60">Módulos incluidos</p>
                <div className="flex flex-wrap gap-2">
                  {plan.limits.modules.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-white/10 px-3 py-1 text-xs capitalize text-white/70"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Fila 2: Inteligencia Artificial — ocupa todo el ancho */}
        <Card>
          <h2 className="font-display mb-2 text-xl">Inteligencia Artificial</h2>
          <p className="mb-6 text-sm text-white/50">
            Configura el modelo de lenguaje para el asistente de tus eventos. Compatible con
            cualquier proveedor que use la API de OpenAI:{' '}
            <span className="text-white/70">OpenRouter, OpenAI, Groq, Azure, Ollama…</span>
          </p>
          <LlmForm
            current={{
              baseUrl: llmCfg?.baseUrl,
              model: llmCfg?.model,
              active: !!llmCfg,
            }}
          />
        </Card>
      </div>
    </>
  );
}
