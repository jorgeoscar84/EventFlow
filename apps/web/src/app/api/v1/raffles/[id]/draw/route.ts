import { z } from 'zod';
import { drawRound, rejectLastWinner } from '@eventflow/db';
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

const schema = z.object({ roundNumber: z.number().int().min(1), redraw: z.boolean().optional() });

/** Sortea o re-sortea una ronda (PRD M9). */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requirePermission('raffle:run');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');
    const { id } = await params;
    const { roundNumber, redraw } = schema.parse(await req.json());
    if (redraw) await rejectLastWinner(user.tenantId, id, roundNumber);
    const outcome = await drawRound(user.tenantId, id, roundNumber);
    if (!outcome) return fail(404, 'NOT_FOUND', 'Sorteo o ronda no encontrada');
    return ok(outcome);
  });
}
