'use server';

import { revalidatePath } from 'next/cache';
import { setEventAgentEnabled, ingestEventKnowledge, addFaq } from '@eventflow/db';
import { getCurrentUser } from '@/lib/auth';

async function guard(tenantId?: string | null, isSuper?: boolean, perms?: string[]) {
  if (!tenantId) throw new Error('no-tenant');
  if (!isSuper && !perms?.includes('ai:configure')) throw new Error('forbidden');
}

export interface AsstState {
  message: string | null;
  error: string | null;
}

export async function toggleAssistantAction(_prev: AsstState, formData: FormData): Promise<AsstState> {
  const user = await getCurrentUser();
  try {
    await guard(user?.tenantId, user?.isSuperAdmin, user?.permissions);
  } catch {
    return { message: null, error: 'No autorizado.' };
  }
  const eventId = String(formData.get('eventId') ?? '');
  const enabled = formData.get('enabled') === 'on';
  await setEventAgentEnabled(user!.tenantId!, eventId, enabled);
  if (enabled) await ingestEventKnowledge(user!.tenantId!, eventId);
  revalidatePath(`/dashboard/events/${eventId}/asistente`);
  return { message: enabled ? 'Asistente activado y conocimiento indexado.' : 'Asistente desactivado.', error: null };
}

export async function reindexAction(_prev: AsstState, formData: FormData): Promise<AsstState> {
  const user = await getCurrentUser();
  try {
    await guard(user?.tenantId, user?.isSuperAdmin, user?.permissions);
  } catch {
    return { message: null, error: 'No autorizado.' };
  }
  const eventId = String(formData.get('eventId') ?? '');
  const n = await ingestEventKnowledge(user!.tenantId!, eventId);
  revalidatePath(`/dashboard/events/${eventId}/asistente`);
  return { message: `Conocimiento re-indexado (${n} fragmentos).`, error: null };
}

export async function addFaqAction(_prev: AsstState, formData: FormData): Promise<AsstState> {
  const user = await getCurrentUser();
  try {
    await guard(user?.tenantId, user?.isSuperAdmin, user?.permissions);
  } catch {
    return { message: null, error: 'No autorizado.' };
  }
  const eventId = String(formData.get('eventId') ?? '');
  const q = String(formData.get('question') ?? '').trim();
  const a = String(formData.get('answer') ?? '').trim();
  if (q.length < 3 || a.length < 3) return { message: null, error: 'Completa pregunta y respuesta.' };
  await addFaq(user!.tenantId!, eventId, q, a);
  revalidatePath(`/dashboard/events/${eventId}/asistente`);
  return { message: 'FAQ añadida al conocimiento.', error: null };
}
