import { prisma } from '../index';
import type { Prisma } from '@prisma/client';

export class PlanLimitError extends Error {
  constructor(public limit: string) {
    super(`Límite del plan alcanzado: ${limit}`);
    this.name = 'PlanLimitError';
  }
}

interface PlanLimits {
  activeEvents?: number;
  teamMembers?: number;
  emailsPerMonth?: number;
  modules?: string[];
}

export async function getPlanLimits(tenantId: string): Promise<PlanLimits> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
  return (tenant?.plan?.limits as PlanLimits) ?? {};
}

export async function countActiveEvents(tenantId: string): Promise<number> {
  return prisma.event.count({
    where: { tenantId, deletedAt: null, status: { in: ['draft', 'published'] } },
  });
}

/** Lanza PlanLimitError si crear un evento excede el plan. PRD §2.5. */
export async function assertCanCreateEvent(tenantId: string): Promise<void> {
  const limits = await getPlanLimits(tenantId);
  if (limits.activeEvents == null) return; // ilimitado
  const current = await countActiveEvents(tenantId);
  if (current >= limits.activeEvents) throw new PlanLimitError('eventos activos');
}

export interface Branding {
  displayName?: string;
  accentColor?: string;
  logoUrl?: string;
}

export async function updateTenantBranding(tenantId: string, branding: Branding) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { branding: branding as Prisma.InputJsonValue },
  });
}

export async function getTenantBranding(tenantId: string): Promise<Branding> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { branding: true } });
  return (t?.branding as Branding) ?? {};
}

/** Resumen de uso vs. límites del plan (panel). */
export async function getPlanUsage(tenantId: string) {
  const [limits, activeEvents, teamMembers] = await Promise.all([
    getPlanLimits(tenantId),
    countActiveEvents(tenantId),
    prisma.user.count({ where: { tenantId, deletedAt: null } }),
  ]);
  return { limits, usage: { activeEvents, teamMembers } };
}
