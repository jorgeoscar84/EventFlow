import { z } from 'zod';
import { markManualPayment } from '@eventflow/db';
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

const schema = z.object({ paid: z.boolean(), notes: z.string().max(500).optional() });

/** Marca manualmente un registro como pagado / no pagado (PRD M11). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const user = await requirePermission('payment:manage');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');
    const { id } = await params;
    const { paid, notes } = schema.parse(await req.json());
    const payment = await markManualPayment(user.tenantId, id, paid, notes);
    if (!payment) return fail(404, 'NOT_FOUND', 'Registro no encontrado');
    return ok(payment);
  });
}
