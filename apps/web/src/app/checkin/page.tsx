import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { listScannableEvents } from '@eventflow/db';
import { formatEventDate } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function CheckinHome() {
  const user = await getCurrentUser();
  if (!user?.tenantId) {
    return <p className="text-white/50">No hay eventos disponibles para tu cuenta.</p>;
  }
  const events = await listScannableEvents(user.tenantId);

  return (
    <>
      <h1 className="font-display mb-1 text-2xl">Selecciona un evento</h1>
      <p className="mb-6 text-sm text-white/50">Elige el evento para escanear los pases.</p>

      {events.length === 0 ? (
        <p className="text-white/50">No hay eventos publicados.</p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/checkin/${ev.id}`}
              className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
            >
              <p className="font-medium">{ev.title}</p>
              <p className="mt-1 text-sm text-white/45">
                {formatEventDate(ev.startsAt)} · {ev.locationName ?? 'Online'}
              </p>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
