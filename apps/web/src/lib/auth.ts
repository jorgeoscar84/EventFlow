import 'server-only';
import { getUserAccessByEmail, type UserAccess } from '@eventflow/db';
import { createSupabaseServerClient } from './supabase/server';

/**
 * Devuelve el usuario autenticado con su acceso (tenant, roles, permisos),
 * combinando la sesión de Supabase Auth con nuestra tabla User. PRD M1.
 */
export async function getCurrentUser(): Promise<UserAccess | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;
  return getUserAccessByEmail(user.email);
}

export class AuthError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Exige sesión válida. */
export async function requireUser(): Promise<UserAccess> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, 'UNAUTHENTICATED', 'No autenticado');
  return user;
}

/** Exige Super Admin. */
export async function requireSuperAdmin(): Promise<UserAccess> {
  const user = await requireUser();
  if (!user.isSuperAdmin) throw new AuthError(403, 'FORBIDDEN', 'Requiere super admin');
  return user;
}

/** Exige un permiso concreto dentro del tenant del usuario. */
export async function requirePermission(permission: string): Promise<UserAccess> {
  const user = await requireUser();
  if (!user.isSuperAdmin && !user.permissions.includes(permission)) {
    throw new AuthError(403, 'FORBIDDEN', `Falta permiso: ${permission}`);
  }
  return user;
}
