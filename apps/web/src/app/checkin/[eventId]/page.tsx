import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getCheckinStats } from '@eventflow/db';
import { Scanner } from './scanner';

export const dynamic = 'force-dynamic';

export default async function CheckinEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const user = await getCurrentUser();
  if (!user?.tenantId) notFound();
  const stats = await getCheckinStats(user.tenantId, eventId);
  if (!stats) notFound();

  return (
    <>
      <Link href="/checkin" className="text-sm text-white/40 hover:text-white/70">
        ← Eventos
      </Link>
      <h1 className="font-display mt-3 mb-5 text-2xl leading-tight">{stats.event.title}</h1>
      <Scanner eventId={eventId} initialAttended={stats.attended} initialTotal={stats.total} />
    </>
  );
}
