'use server';

import { redirect } from 'next/navigation';
import { createRaffle } from '@eventflow/db';
import { getCurrentUser } from '@/lib/auth';

export interface CreateRaffleState {
  error: string | null;
}

export async function createRaffleAction(
  _prev: CreateRaffleState,
  formData: FormData,
): Promise<CreateRaffleState> {
  const user = await getCurrentUser();
  if (!user?.tenantId) return { error: 'No autorizado.' };
  if (!user.isSuperAdmin && !user.permissions.includes('raffle:run')) {
    return { error: 'No tienes permiso para sorteos.' };
  }

  const eventId = String(formData.get('eventId') ?? '');
  const name = String(formData.get('name') ?? '').trim();
  const totalWinners = Number(formData.get('totalWinners') ?? '1');
  const requirePresent = formData.get('requirePresent') === 'on';
  const prizes = String(formData.get('prizes') ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const includeConfirmed = formData.get('includeConfirmed') === 'on';

  if (name.length < 2) return { error: 'Ponle un nombre al sorteo.' };

  const raffle = await createRaffle(user.tenantId, {
    eventId,
    name,
    totalWinners: Math.max(1, Math.min(50, totalWinners)),
    requirePresent,
    prizes,
    eligibleStatus: includeConfirmed ? ['confirmed', 'attended'] : ['attended'],
  });

  redirect(`/sorteo/${raffle.id}`);
}
