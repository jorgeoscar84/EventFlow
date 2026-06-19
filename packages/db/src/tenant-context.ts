import { prisma } from './index';
import type { Prisma } from '@prisma/client';

/**
 * Ejecuta una función dentro de una transacción con el contexto de tenant fijado
 * (app.tenant_id), de modo que las políticas RLS apliquen. PRD/02 §2.3, PRD/09.
 *
 * Nota: con el rol propietario, RLS no fuerza el aislamiento (ver DECISIONS ADR-009);
 * el filtrado por tenantId en los servicios sigue siendo obligatorio.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
    return fn(tx);
  });
}
