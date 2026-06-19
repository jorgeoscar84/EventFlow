import { randomBytes } from 'node:crypto';
import { prisma } from '../index';
import { pickWinner } from '@eventflow/core';

export interface CreateRaffleInput {
  eventId: string;
  name: string;
  totalWinners: number;
  requirePresent?: boolean;
  prizes?: string[];
  eligibleStatus?: string[];
}

/** Crea un sorteo con semilla auditable y sus rondas (PRD M9). */
export async function createRaffle(tenantId: string, input: CreateRaffleInput) {
  const seed = randomBytes(16).toString('hex');
  const prizes = input.prizes ?? [];
  const raffle = await prisma.raffle.create({
    data: {
      tenantId,
      eventId: input.eventId,
      name: input.name,
      seed,
      totalWinners: input.totalWinners,
      requirePresent: input.requirePresent ?? true,
      eligibleFilter: { status: input.eligibleStatus ?? ['attended'] },
      prizes,
      status: 'configured',
      rounds: {
        create: Array.from({ length: input.totalWinners }, (_, i) => ({
          roundNumber: i + 1,
          prize: prizes[i] ?? `Premio ${i + 1}`,
          status: 'pending',
        })),
      },
    },
    include: { rounds: true },
  });
  return raffle;
}

export async function getRaffleState(tenantId: string, raffleId: string) {
  const raffle = await prisma.raffle.findFirst({
    where: { id: raffleId, tenantId },
    include: {
      event: { select: { title: true } },
      rounds: { orderBy: { roundNumber: 'asc' }, include: { winners: { orderBy: { drawnAt: 'asc' } } } },
    },
  });
  if (!raffle) return null;

  // Nombres de ganadores aceptados.
  const winnerIds = raffle.rounds.flatMap((r) => r.winners.map((w) => w.registrationId));
  const regs = winnerIds.length
    ? await prisma.registration.findMany({ where: { id: { in: winnerIds } }, select: { id: true, fullName: true } })
    : [];
  const nameById = new Map(regs.map((r) => [r.id, r.fullName]));

  return { raffle, nameById: Object.fromEntries(nameById) };
}

/** Nombres elegibles (para la animación del bombo). */
export async function listEligibleNames(tenantId: string, raffleId: string): Promise<string[]> {
  const raffle = await prisma.raffle.findFirst({ where: { id: raffleId, tenantId } });
  if (!raffle) return [];
  const statuses = (raffle.eligibleFilter as { status?: string[] })?.status ?? ['attended'];
  const regs = await prisma.registration.findMany({
    where: { eventId: raffle.eventId, status: { in: statuses as never } },
    select: { fullName: true },
    take: 500,
  });
  return regs.map((r) => r.fullName);
}

export interface DrawOutcome {
  exhausted?: boolean;
  winner?: { id: string; name: string; present: boolean };
  accepted?: boolean;
  prize?: string | null;
  roundNumber?: number;
}

/**
 * Sortea (o re-sortea) una ronda. Excluye ganadores aceptados de otras rondas y
 * los ya intentados en esta. Si requirePresent y el ganador no está presente,
 * queda 'drawing' (pendiente de re-sorteo). Determinista por semilla auditable.
 */
export async function drawRound(
  tenantId: string,
  raffleId: string,
  roundNumber: number,
): Promise<DrawOutcome | null> {
  const raffle = await prisma.raffle.findFirst({
    where: { id: raffleId, tenantId },
    include: { rounds: { include: { winners: true } } },
  });
  if (!raffle) return null;
  const round = raffle.rounds.find((r) => r.roundNumber === roundNumber);
  if (!round) return null;

  const statuses = (raffle.eligibleFilter as { status?: string[] })?.status ?? ['attended'];
  const eligible = await prisma.registration.findMany({
    where: { eventId: raffle.eventId, status: { in: statuses as never } },
    select: { id: true, fullName: true, status: true, checkedInAt: true },
  });

  const acceptedElsewhere = raffle.rounds.flatMap((r) =>
    r.winners.filter((w) => w.accepted).map((w) => w.registrationId),
  );
  const triedThisRound = round.winners.map((w) => w.registrationId);
  const exclude = [...new Set([...acceptedElsewhere, ...triedThisRound])];

  const winnerId = pickWinner(
    eligible.map((e) => e.id),
    raffle.seed ?? raffleId,
    roundNumber * 1000 + triedThisRound.length,
    exclude,
  );
  if (!winnerId) return { exhausted: true, roundNumber };

  const w = eligible.find((e) => e.id === winnerId)!;
  const present = w.status === 'attended' || w.checkedInAt != null;
  const accepted = present || !raffle.requirePresent;

  await prisma.$transaction([
    prisma.raffleWinner.create({
      data: { raffleRoundId: round.id, registrationId: winnerId, wasPresent: present, accepted },
    }),
    prisma.raffleRound.update({ where: { id: round.id }, data: { status: accepted ? 'won' : 'drawing' } }),
    prisma.raffle.update({ where: { id: raffle.id }, data: { status: 'running' } }),
  ]);

  return { winner: { id: winnerId, name: w.fullName, present }, accepted, prize: round.prize, roundNumber };
}

/** Marca un re-sorteo: la última propuesta de la ronda se rechaza. */
export async function rejectLastWinner(tenantId: string, raffleId: string, roundNumber: number) {
  const raffle = await prisma.raffle.findFirst({ where: { id: raffleId, tenantId }, include: { rounds: { include: { winners: { orderBy: { drawnAt: 'desc' } } } } } });
  const round = raffle?.rounds.find((r) => r.roundNumber === roundNumber);
  const last = round?.winners[0];
  if (!round || !last) return;
  await prisma.$transaction([
    prisma.raffleWinner.update({ where: { id: last.id }, data: { accepted: false } }),
    prisma.raffleRound.update({ where: { id: round.id }, data: { status: 'redrawn' } }),
  ]);
}

export async function listRaffles(tenantId: string, eventId: string) {
  return prisma.raffle.findMany({
    where: { tenantId, eventId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { rounds: true } } },
  });
}
