import { notFound, redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getRaffleState, listEligibleNames } from '@eventflow/db';
import { ShowStage } from './show-stage';

export const dynamic = 'force-dynamic';

export default async function SorteoShowPage({ params }: { params: Promise<{ raffleId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (!user.tenantId || (!user.isSuperAdmin && !user.permissions.includes('raffle:run'))) {
    redirect('/dashboard');
  }
  const { raffleId } = await params;
  const state = await getRaffleState(user.tenantId, raffleId);
  if (!state) notFound();
  const names = await listEligibleNames(user.tenantId, raffleId);

  const rounds = state.raffle.rounds.map((r) => {
    const accepted = r.winners.find((w) => w.accepted);
    return {
      roundNumber: r.roundNumber,
      prize: r.prize,
      status: r.status,
      winnerName: accepted ? state.nameById[accepted.registrationId] : undefined,
    };
  });

  return (
    <ShowStage
      raffleId={raffleId}
      eventTitle={state.raffle.event.title}
      names={names}
      rounds={rounds}
    />
  );
}
