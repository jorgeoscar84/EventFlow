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
export * from './tenant-context';
export * from './services/tenant';
export * from './services/event';
export * from './services/auth';
export * from './services/registration';
export * from './services/public';
export * from './services/checkin';
export * from './services/messaging';
export * from './services/payment';
export * from './services/report';
export * from './services/raffle';
