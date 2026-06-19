import { z } from 'zod';
import { isValidSlug } from '@eventflow/core';
import { provisionTenant, listTenants } from '@eventflow/db';
import { requireSuperAdmin } from '@/lib/auth';
import { ok, handle } from '@/lib/api';

const createTenantSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().refine(isValidSlug, 'Slug inválido (minúsculas, números y guiones)'),
  adminEmail: z.string().email(),
  adminName: z.string().min(2).max(120),
  planId: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  return handle(async () => {
    await requireSuperAdmin();
    const url = new URL(req.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const result = await listTenants(page);
    return ok(result.items, { headers: { 'x-total': String(result.pagination.total) } });
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    await requireSuperAdmin();
    const body = createTenantSchema.parse(await req.json());
    const result = await provisionTenant(body);
    return ok(result, { status: 201 });
  });
}
