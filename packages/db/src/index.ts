import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma singleton (evita múltiples instancias en dev/HMR).
 * El aislamiento multi-tenant se aplica en la capa de dominio (packages/core)
 * inyectando tenant_id, con RLS de Postgres como red de seguridad (ver PRD/09).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export * from '@prisma/client';
