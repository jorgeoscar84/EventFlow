import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { listRegistrations } from '@eventflow/db';
import type { RegistrationStatus } from '@eventflow/db';
import { PageHeader } from '@/components/app-shell';
import { Card, Badge } from '@/components/ui/card';
import { PaymentToggle } from './payment-toggle';

export const dynamic = 'force-dynamic';

const statuses: { key: string; label: string }[] = [
  { key: '', label: 'Todos' },
  { key: 'registered', label: 'Registrados' },
  { key: 'confirmed', label: 'Confirmados' },
  { key: 'attended', label: 'Asistieron' },
  { key: 'waitlist', label: 'Lista de espera' },
];

export default async function RegistrosPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string; paid?: string; q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user?.tenantId) notFound();
  const { id } = await params;
  const sp = await searchParams;

  const data = await listRegistrations(user.tenantId, id, {
    status: (sp.status as RegistrationStatus) || undefined,
    paid: (sp.paid as 'paid' | 'unpaid') || undefined,
    q: sp.q || undefined,
  });
  if (!data) notFound();

  const qs = (patch: Record<string, string>) => {
    const merged: Record<string, string> = {};
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) merged[k] = v as string;
    return `?${new URLSearchParams(merged).toString()}`;
  };

  return (
    <>
      <Link href={`/dashboard/events/${id}`} className="text-sm text-white/40 hover:text-white/70">
        ← Detalle del evento
      </Link>
      <PageHeader
        title="Registros"
        description={`${data.pagination.total} personas`}
        action={
          <div className="flex gap-2">
            <a
              href={`/api/v1/events/${id}/export?format=csv`}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
            >
              CSV
            </a>
            <a
              href={`/api/v1/events/${id}/export?format=xlsx`}
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-950"
            >
              Excel
            </a>
          </div>
        }
      />

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {statuses.map((s) => (
          <Link
            key={s.key}
            href={qs({ status: s.key })}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              (sp.status ?? '') === s.key
                ? 'bg-white text-ink-950'
                : 'border border-white/15 text-white/60 hover:bg-white/10'
            }`}
          >
            {s.label}
          </Link>
        ))}
        <span className="mx-1 h-4 w-px bg-white/15" />
        <Link
          href={qs({ paid: sp.paid === 'paid' ? '' : 'paid' })}
          className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
            sp.paid === 'paid' ? 'bg-emerald-500/20 text-emerald-300' : 'border border-white/15 text-white/60 hover:bg-white/10'
          }`}
        >
          Solo pagados
        </Link>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-white/10 text-left text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              {data.customFields.map((c) => (
                <th key={c.key} className="px-4 py-3 font-medium">
                  {c.label}
                </th>
              ))}
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Pago</th>
              <th className="px-4 py-3 font-medium">Check-in</th>
            </tr>
          </thead>
          <tbody>
            {data.items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  Sin registros con estos filtros.
                </td>
              </tr>
            ) : (
              data.items.map((r) => (
                <tr key={r.id} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{r.fullName}</td>
                  <td className="px-4 py-3 text-white/60">{r.email}</td>
                  {data.customFields.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-white/60">
                      {r.fields[c.key] ?? '—'}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <Badge kind={r.status}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <PaymentToggle registrationId={r.id} paid={r.paid} />
                  </td>
                  <td className="px-4 py-3 text-white/50">
                    {r.checkedInAt ? '✓' : '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </>
  );
}
