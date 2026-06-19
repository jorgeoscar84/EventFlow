import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listEvents } from '@eventflow/db';
import { PageHeader } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { Card, Badge } from '@/components/ui/card';

const typeLabel: Record<string, string> = {
  in_person: 'Presencial',
  digital: 'Digital',
  hybrid: 'Híbrido',
};

export default async function EventsPage() {
  const user = await getCurrentUser();
  if (!user?.tenantId) return null;
  const { items } = await listEvents(user.tenantId, {});

  return (
    <>
      <PageHeader
        title="Eventos"
        description="Gestiona tus eventos presenciales y digitales."
        action={
          <Link href="/dashboard/events/new">
            <Button>Crear evento</Button>
          </Link>
        }
      />

      {items.length === 0 ? (
        <Card className="text-center text-white/50">
          Aún no tienes eventos.{' '}
          <Link href="/dashboard/events/new" className="text-brand-500 hover:underline">
            Crea el primero
          </Link>
          .
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((ev) => (
            <Link key={ev.id} href={`/dashboard/events/${ev.id}`}>
              <Card className="flex h-full flex-col gap-3 transition-colors hover:border-white/25 hover:bg-white/[0.05]">
                <div className="flex items-center justify-between">
                  <Badge kind={ev.status}>{ev.status}</Badge>
                  <span className="text-xs text-white/40">{typeLabel[ev.type] ?? ev.type}</span>
                </div>
                <h3 className="text-base font-medium leading-snug">{ev.title}</h3>
                <p className="text-sm text-white/50">
                  {new Date(ev.startsAt).toLocaleString('es', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
                {ev.locationName && <p className="text-xs text-white/40">{ev.locationName}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
