import { z } from 'zod';
import { createRaffle, listRaffles } from '@eventflow/db';
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

const schema = z.object({
  name: z.string().min(2).max(120),
  totalWinners: z.number().int().min(1).max(50),
  requirePresent: z.boolean().optional(),
  prizes: z.array(z.string()).optional(),
  eligibleStatus: z.array(z.string()).optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requirePermission('raffle:run');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');
    const { id } = await params;
    return ok(await listRaffles(user.tenantId, id));
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requirePermission('raffle:run');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');
    const { id } = await params;
    const body = schema.parse(await req.json());
    const raffle = await createRaffle(user.tenantId, { eventId: id, ...body });
    return ok(raffle, { status: 201 });
  });
}
