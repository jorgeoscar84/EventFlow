import { getCheckinStats } from '@eventflow/db';
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  return handle(async () => {
    const user = await requirePermission('checkin:scan');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');
    const { eventId } = await params;
    const stats = await getCheckinStats(user.tenantId, eventId);
    if (!stats) return fail(404, 'EVENT_NOT_FOUND', 'Evento no encontrado');
    return ok(stats);
  });
}
