import { createEventSchema } from '@eventflow/core';
import { createEvent, listEvents } from '@eventflow/db';
import type { EventStatus } from '@eventflow/db';
import { requirePermission, requireUser } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

export async function GET(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'El usuario no pertenece a un tenant');
    const url = new URL(req.url);
    const result = await listEvents(user.tenantId, {
      status: (url.searchParams.get('status') as EventStatus | null) ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
      page: Number(url.searchParams.get('page') ?? '1'),
    });
    return ok(result.items, { headers: { 'x-total': String(result.pagination.total) } });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requirePermission('event:create');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'El usuario no pertenece a un tenant');
    const data = createEventSchema.parse(await req.json());
    const event = await createEvent(user.tenantId, data);
    return ok(event, { status: 201 });
  });
}
