import { z } from 'zod';
import { getEvent, updateEvent } from '@eventflow/db';
import { requirePermission, requireUser } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

const updateEventSchema = z
  .object({
    title: z.string().min(3).max(160),
    description: z.string(),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    timezone: z.string(),
    capacity: z.number().int().positive().nullable(),
    locationName: z.string(),
    onlineUrl: z.string().url(),
  })
  .partial();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requireUser();
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'El usuario no pertenece a un tenant');
    const { id } = await params;
    const event = await getEvent(user.tenantId, id);
    if (!event) return fail(404, 'NOT_FOUND', 'Evento no encontrado');
    return ok(event);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requirePermission('event:edit');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'El usuario no pertenece a un tenant');
    const { id } = await params;
    const body = updateEventSchema.parse(await req.json());
    const updated = await updateEvent(user.tenantId, id, body);
    if (!updated) return fail(404, 'NOT_FOUND', 'Evento no encontrado');
    return ok(updated);
  });
}
