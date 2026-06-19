import { prisma } from '../index';

export interface UserAccess {
  id: string;
  email: string;
  name: string;
  tenantId: string | null;
  isSuperAdmin: boolean;
  status: string;
  permissions: string[];
  roles: string[];
}

/**
 * Carga un usuario por email con su tenant, roles y permisos efectivos.
 * Base de la autorización (PRD M1/M12). Devuelve null si no existe.
 */
export async function getUserAccessByEmail(email: string): Promise<UserAccess | null> {
  const user = await prisma.user.findFirst({
    where: { email, deletedAt: null },
    include: {
      userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } },
    },
  });
  if (!user) return null;

  const permissions = new Set<string>();
  const roles: string[] = [];
  for (const ur of user.userRoles) {
    roles.push(ur.role.name);
    for (const rp of ur.role.rolePermissions) permissions.add(rp.permission.key);
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    tenantId: user.tenantId,
    isSuperAdmin: user.isSuperAdmin,
    status: user.status,
    permissions: [...permissions],
    roles,
  };
}
