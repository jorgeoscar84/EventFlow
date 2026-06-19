import { z } from 'zod';
import { scanCheckin, getCheckinStats } from '@eventflow/db';
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

const scanSchema = z.object({
  eventId: z.string().uuid(),
  qrToken: z.string().min(1),
  gate: z.string().max(60).optional(),
});

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requirePermission('checkin:scan');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');

    const { eventId, qrToken, gate } = scanSchema.parse(await req.json());

    // El evento debe pertenecer al tenant del usuario.
    const stats = await getCheckinStats(user.tenantId, eventId);
    if (!stats) return fail(404, 'EVENT_NOT_FOUND', 'Evento no encontrado en tu cuenta');

    const outcome = await scanCheckin({
      tenantId: user.tenantId,
      eventId,
      qrToken,
      scannedById: user.id,
      gate: gate ?? null,
    });
    return ok(outcome);
  });
}
