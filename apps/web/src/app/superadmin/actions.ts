'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isValidSlug } from '@eventflow/core';
import { provisionTenant } from '@eventflow/db';
import { requireSuperAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().refine(isValidSlug, 'Slug inválido (minúsculas, números y guiones).'),
  adminEmail: z.string().email(),
  adminName: z.string().min(2).max(120),
});

export interface CreateTenantState {
  error: string | null;
  success: { email: string; tempPassword: string } | null;
}

/**
 * Aprovisiona una empresa (tenant) y crea su usuario admin en Supabase Auth.
 * Devuelve una contraseña temporal para el primer acceso. PRD M2.
 */
export async function createTenantAction(
  _prev: CreateTenantState,
  formData: FormData,
): Promise<CreateTenantState> {
  await requireSuperAdmin();

  const parsed = schema.safeParse({
    name: formData.get('name'),
    slug: formData.get('slug'),
    adminEmail: formData.get('adminEmail'),
    adminName: formData.get('adminName'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.', success: null };
  }

  const tempPassword = randomBytes(9).toString('base64url');

  try {
    await provisionTenant(parsed.data);
  } catch {
    return { error: 'No se pudo crear la empresa (¿slug o email duplicado?).', success: null };
  }

  // Crea el usuario de Auth para que el admin pueda iniciar sesión.
  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.auth.admin.createUser({
    email: parsed.data.adminEmail,
    password: tempPassword,
    email_confirm: true,
  });
  if (error) {
    return {
      error: `Empresa creada, pero no se pudo crear el usuario de acceso: ${error.message}`,
      success: null,
    };
  }

  revalidatePath('/superadmin/tenants');
  return { error: null, success: { email: parsed.data.adminEmail, tempPassword } };
}
