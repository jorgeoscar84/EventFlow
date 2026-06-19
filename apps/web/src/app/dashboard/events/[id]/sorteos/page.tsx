import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { listRaffles } from '@eventflow/db';
import { PageHeader } from '@/components/app-shell';
import { Card, Badge } from '@/components/ui/card';
import { RaffleForm } from './raffle-form';

export const dynamic = 'force-dynamic';

export default async function SorteosPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.tenantId) notFound();
  const { id } = await params;
  const raffles = await listRaffles(user.tenantId, id);

  return (
    <>
      <Link href={`/dashboard/events/${id}`} className="text-sm text-white/40 hover:text-white/70">
        ← Detalle del evento
      </Link>
      <PageHeader title="Sorteos" description="Configura y lanza sorteos en vivo entre los asistentes." />

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <h2 className="font-display mb-5 text-xl">Nuevo sorteo</h2>
          <RaffleForm eventId={id} />
        </Card>

        <div>
          <h2 className="font-display mb-4 text-xl">Sorteos creados</h2>
          {raffles.length === 0 ? (
            <p className="text-sm text-white/50">Aún no has creado sorteos.</p>
          ) : (
            <div className="space-y-3">
              {raffles.map((r) => (
                <Card key={r.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-white/45">
                      {r._count.rounds} premio(s) · {r.requirePresent ? 'requiere presencia' : 'sin requisito'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge kind={r.status === 'finished' ? 'finished' : r.status === 'running' ? 'published' : 'draft'}>
                      {r.status}
                    </Badge>
                    <Link
                      href={`/sorteo/${r.id}`}
                      className="rounded-full bg-white px-4 py-2 text-sm font-medium text-ink-950"
                    >
                      Abrir show →
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
