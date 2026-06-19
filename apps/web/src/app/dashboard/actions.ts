'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createEventSchema } from '@eventflow/core';
import { createEvent, PlanLimitError } from '@eventflow/db';
import { getCurrentUser } from '@/lib/auth';

export interface CreateEventState {
  error: string | null;
}

export async function createEventAction(
  _prev: CreateEventState,
  formData: FormData,
): Promise<CreateEventState> {
  const user = await getCurrentUser();
  if (!user?.tenantId) return { error: 'No autorizado.' };
  if (!user.isSuperAdmin && !user.permissions.includes('event:create')) {
    return { error: 'No tienes permiso para crear eventos.' };
  }

  const capacityRaw = String(formData.get('capacity') ?? '').trim();
  const parsed = createEventSchema.safeParse({
    title: formData.get('title'),
    type: formData.get('type'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
    timezone: String(formData.get('timezone') ?? 'UTC') || 'UTC',
    locationName: String(formData.get('locationName') ?? '') || undefined,
    onlineUrl: String(formData.get('onlineUrl') ?? '') || undefined,
    capacity: capacityRaw ? Number(capacityRaw) : null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' };
  }

  try {
    await createEvent(user.tenantId, parsed.data);
  } catch (e) {
    if (e instanceof PlanLimitError) {
      return { error: 'Alcanzaste el límite de eventos activos de tu plan.' };
    }
    throw e;
  }
  revalidatePath('/dashboard/events');
  redirect('/dashboard/events');
}
