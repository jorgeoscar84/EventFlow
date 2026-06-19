import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getEvent, getEventStats, listCampaigns } from '@eventflow/db';
import { PageHeader } from '@/components/app-shell';
import { Card, Badge } from '@/components/ui/card';
import { formatEventDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

function offsetLabel(min: number | null): string {
  if (min == null) return '—';
  const abs = Math.abs(min);
  const txt = abs >= 1440 ? `${abs / 1440} día(s)` : abs >= 60 ? `${abs / 60} h` : `${abs} min`;
  return min < 0 ? `${txt} antes` : `${txt} después`;
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.tenantId) notFound();
  const { id } = await params;
  const [event, stats, campaigns] = await Promise.all([
    getEvent(user.tenantId, id),
    getEventStats(user.tenantId, id),
    listCampaigns(user.tenantId, id),
  ]);
  if (!event || !stats) notFound();

  const funnel = [
    { label: 'Registrados', value: stats.registered, tone: 'text-white' },
    { label: 'Confirmados', value: stats.confirmed, tone: 'text-brand-300' },
    { label: 'Asistieron', value: stats.attended, tone: 'text-emerald-300' },
    { label: 'No-show', value: stats.noShow, tone: 'text-red-300' },
  ];

  return (
    <>
      <Link href="/dashboard/events" className="text-sm text-white/40 hover:text-white/70">
        ← Eventos
      </Link>
      <PageHeader
        title={event.title}
        description={`${formatEventDate(event.startsAt, event.timezone)} · ${event.locationName ?? 'Online'}`}
        action={<Badge kind={event.status}>{event.status}</Badge>}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {funnel.map((f) => (
          <Card key={f.label} className="py-5">
            <p className="text-xs text-white/40">{f.label}</p>
            <p className={`font-display mt-1 text-3xl ${f.tone}`}>{f.value}</p>
          </Card>
        ))}
      </div>

      <h2 className="font-display mt-10 mb-3 text-xl">Mensajería automática</h2>
      <Card className="p-0">
        {campaigns.length === 0 ? (
          <p className="p-6 text-sm text-white/50">
            Publica el evento para generar las campañas automáticas.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 text-left text-white/50">
              <tr>
                <th className="px-5 py-3 font-medium">Campaña</th>
                <th className="px-5 py-3 font-medium">Cuándo</th>
                <th className="px-5 py-3 font-medium">Audiencia</th>
                <th className="px-5 py-3 font-medium">Envíos</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0">
                  <td className="px-5 py-3 capitalize">{c.name.replace(/_/g, ' ')}</td>
                  <td className="px-5 py-3 text-white/60">{offsetLabel(c.offsetMinutes)}</td>
                  <td className="px-5 py-3 text-white/60">
                    {(c.audienceFilter as { status?: string[] })?.status?.join(', ') ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-white/60">{c._count.jobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="mt-3 text-xs text-white/30">
        Los envíos se procesan automáticamente por el worker (recordatorios y reconfirmación). El
        envío real requiere credenciales de Amazon SES configuradas.
      </p>
    </>
  );
}
