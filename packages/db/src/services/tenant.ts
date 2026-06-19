import { prisma } from '../index';
import { SYSTEM_ROLES } from '@eventflow/core';

export interface ProvisionTenantInput {
  name: string;
  slug: string;
  adminEmail: string;
  adminName: string;
  planId?: string;
}

export interface ProvisionTenantResult {
  tenantId: string;
  adminUserId: string;
  rolesCreated: string[];
}

/**
 * Aprovisiona un tenant nuevo (acción de Super Admin, PRD M2):
 * crea el tenant, sus roles de sistema con permisos y el usuario org_admin.
 * Idempotencia: falla si el slug ya existe (constraint único).
 */
export async function provisionTenant(
  input: ProvisionTenantInput,
): Promise<ProvisionTenantResult> {
  const permissions = await prisma.permission.findMany();
  const permIdByKey = new Map(permissions.map((p) => [p.key, p.id]));

  // Plan por defecto: el indicado o el primero activo.
  const planId =
    input.planId ?? (await prisma.plan.findFirst({ where: { isActive: true } }))?.id ?? null;

  return prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: { name: input.name, slug: input.slug, status: 'active', planId },
    });

    const rolesCreated: string[] = [];
    let adminRoleId: string | null = null;

    for (const [roleName, permKeys] of Object.entries(SYSTEM_ROLES)) {
      const role = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: roleName,
          isSystem: true,
          rolePermissions: {
            create: permKeys
              .map((k) => permIdByKey.get(k))
              .filter((id): id is string => Boolean(id))
              .map((permissionId) => ({ permissionId })),
          },
        },
      });
      rolesCreated.push(roleName);
      if (roleName === 'org_admin') adminRoleId = role.id;
    }

    const admin = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.adminEmail,
        name: input.adminName,
        status: 'active',
        ...(adminRoleId ? { userRoles: { create: { roleId: adminRoleId } } } : {}),
      },
    });

    return { tenantId: tenant.id, adminUserId: admin.id, rolesCreated };
  });
}

/** Lista tenants (Super Admin, PRD M2). */
export async function listTenants(page = 1, pageSize = 50) {
  const take = Math.min(100, Math.max(1, pageSize));
  const skip = (Math.max(1, page) - 1) * take;
  const [items, total] = await Promise.all([
    prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { plan: true, _count: { select: { events: true, users: true } } },
    }),
    prisma.tenant.count({ where: { deletedAt: null } }),
  ]);
  return { items, pagination: { page, pageSize: take, total } };
}

export async function getTenant(id: string) {
  return prisma.tenant.findUnique({
    where: { id },
    include: { plan: true, _count: { select: { events: true, users: true } } },
  });
}

export async function setTenantStatus(id: string, status: 'active' | 'suspended' | 'trial') {
  return prisma.tenant.update({ where: { id }, data: { status } });
}
