'use server';

import { redirect } from 'next/navigation';
import { registrationInputSchema } from '@eventflow/core';
import { registerForEvent } from '@eventflow/db';
import { sendConfirmationEmail } from '@/lib/email';

export interface RegisterState {
  error: string | null;
}

export async function registerAction(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const tenant = String(formData.get('__tenant') ?? '');
  const eventSlug = String(formData.get('__event') ?? '');

  // Campos personalizados: cf_<key>
  const customFields: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith('cf_')) customFields[k.slice(3)] = String(v);
  }

  const parsed = registrationInputSchema.safeParse({
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    phone: formData.get('phone'),
    customFields,
    consentMarketing: formData.get('consentMarketing') === 'on',
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revisa los datos del formulario.' };
  }

  const result = await registerForEvent(tenant, eventSlug, {
    ...parsed.data,
    source: 'landing',
  });

  if (!result.ok) {
    const messages = {
      event_not_found: 'El evento no existe o no está disponible.',
      closed: 'El registro para este evento está cerrado.',
      full: 'El evento está completo.',
    } as const;
    return { error: messages[result.reason] };
  }

  // Email de confirmación (best-effort; no bloquea el registro).
  if (!result.alreadyRegistered) {
    const base = process.env.APP_BASE_URL ?? '';
    await sendConfirmationEmail({
      to: parsed.data.email,
      name: parsed.data.fullName,
      eventTitle: result.eventTitle,
      passUrl: `${base}/pase/${result.qrToken}`,
      confirmUrl: `${base}/confirmar/${result.confirmationToken}`,
    });
  }

  redirect(`/pase/${result.qrToken}`);
}
