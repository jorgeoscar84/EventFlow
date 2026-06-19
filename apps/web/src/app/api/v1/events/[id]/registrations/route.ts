import { listRegistrations } from '@eventflow/db';
import type { RegistrationStatus } from '@eventflow/db';
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requirePermission('registration:view');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');
    const { id } = await params;
    const url = new URL(req.url);
    const result = await listRegistrations(user.tenantId, id, {
      status: (url.searchParams.get('status') as RegistrationStatus | null) ?? undefined,
      paid: (url.searchParams.get('paid') as 'paid' | 'unpaid' | null) ?? undefined,
      q: url.searchParams.get('q') ?? undefined,
      page: Number(url.searchParams.get('page') ?? '1'),
    });
    if (!result) return fail(404, 'NOT_FOUND', 'Evento no encontrado');
    return ok(result.items, { headers: { 'x-total': String(result.pagination.total) } });
  });
}
