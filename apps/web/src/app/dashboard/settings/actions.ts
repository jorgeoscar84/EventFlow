'use server';

import { revalidatePath } from 'next/cache';
import { updateTenantBranding } from '@eventflow/db';
import { getCurrentUser } from '@/lib/auth';

export interface BrandingState {
  ok: boolean;
  error: string | null;
}

export async function saveBrandingAction(
  _prev: BrandingState,
  formData: FormData,
): Promise<BrandingState> {
  const user = await getCurrentUser();
  if (!user?.tenantId) return { ok: false, error: 'No autorizado.' };
  if (!user.isSuperAdmin && !user.permissions.includes('tenant:manage')) {
    return { ok: false, error: 'No tienes permiso para editar la marca.' };
  }

  const accentColor = String(formData.get('accentColor') ?? '').trim();
  const displayName = String(formData.get('displayName') ?? '').trim();
  const logoUrl = String(formData.get('logoUrl') ?? '').trim();

  if (accentColor && !/^#([0-9a-fA-F]{6})$/.test(accentColor)) {
    return { ok: false, error: 'El color debe ser hex (#RRGGBB).' };
  }

  await updateTenantBranding(user.tenantId, {
    accentColor: accentColor || undefined,
    displayName: displayName || undefined,
    logoUrl: logoUrl || undefined,
  });
  revalidatePath('/dashboard/settings');
  return { ok: true, error: null };
}
