import { publishEvent } from '@eventflow/db';
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requirePermission('event:publish');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'El usuario no pertenece a un tenant');
    const { id } = await params;
    const event = await publishEvent(user.tenantId, id);
    if (!event) return fail(404, 'NOT_FOUND', 'Evento no encontrado');
    return ok(event);
  });
}
