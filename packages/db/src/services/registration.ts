import { randomBytes } from 'node:crypto';
import { prisma } from '../index';
import type { Prisma } from '@prisma/client';

function token(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

export interface RegisterInput {
  fullName: string;
  email: string;
  phone: string;
  customFields?: Record<string, string | number | boolean>;
  ticketTypeId?: string | null;
  consentMarketing?: boolean;
  source?: string;
}

export type RegisterResult =
  | {
      ok: true;
      registrationId: string;
      qrToken: string;
      confirmationToken: string;
      eventTitle: string;
      status: string;
      alreadyRegistered: boolean;
    }
  | { ok: false; reason: 'event_not_found' | 'closed' | 'full' };

/**
 * Registra a un asistente en un evento público (PRD M5).
 * Reglas: evento publicado, dedupe por email, control de aforo (lista de espera),
 * tokens únicos para QR y confirmación, valores de campos personalizados.
 */
export async function registerForEvent(
  tenantSlug: string,
  eventSlug: string,
  input: RegisterInput,
): Promise<RegisterResult> {
  const event = await prisma.event.findFirst({
    where: { slug: eventSlug, tenant: { slug: tenantSlug }, deletedAt: null },
    include: { customFields: true },
  });
  if (!event) return { ok: false, reason: 'event_not_found' };
  if (event.status !== 'published') return { ok: false, reason: 'closed' };

  // Dedupe por email dentro del evento.
  const existing = await prisma.registration.findFirst({
    where: { eventId: event.id, email: input.email.toLowerCase() },
  });
  if (existing) {
    return {
      ok: true,
      registrationId: existing.id,
      qrToken: existing.qrToken,
      confirmationToken: existing.confirmationToken,
      eventTitle: event.title,
      status: existing.status,
      alreadyRegistered: true,
    };
  }

  // Control de aforo -> lista de espera.
  let status: Prisma.RegistrationCreateInput['status'] = 'registered';
  if (event.capacity != null) {
    const count = await prisma.registration.count({
      where: { eventId: event.id, status: { in: ['registered', 'confirmed', 'attended'] } },
    });
    if (count >= event.capacity) status = 'waitlist';
  }

  const fieldByKey = new Map(event.customFields.map((f) => [f.key, f]));
  const fieldValues = Object.entries(input.customFields ?? {})
    .map(([key, value]) => {
      const field = fieldByKey.get(key);
      if (!field) return null;
      return { customFieldId: field.id, value: String(value) };
    })
    .filter((v): v is { customFieldId: string; value: string } => v !== null);

  const registration = await prisma.registration.create({
    data: {
      tenantId: event.tenantId,
      eventId: event.id,
      ticketTypeId: input.ticketTypeId ?? null,
      fullName: input.fullName.trim(),
      email: input.email.toLowerCase(),
      phone: input.phone.trim(),
      status,
      qrToken: token(),
      confirmationToken: token(),
      consentMarketing: input.consentMarketing ?? false,
      source: input.source ?? null,
      ...(fieldValues.length ? { fieldValues: { create: fieldValues } } : {}),
    },
  });

  return {
    ok: true,
    registrationId: registration.id,
    qrToken: registration.qrToken,
    confirmationToken: registration.confirmationToken,
    eventTitle: event.title,
    status: registration.status,
    alreadyRegistered: false,
  };
}

/** Carga el pase de un registro por su qrToken (página de éxito / confirmación). */
export async function getRegistrationByQr(qrToken: string) {
  return prisma.registration.findUnique({
    where: { qrToken },
    include: { event: { include: { tenant: true } } },
  });
}

/** Confirma asistencia mediante el confirmationToken (anti no-show, PRD M6). */
export async function confirmRegistration(confirmationToken: string) {
  const reg = await prisma.registration.findUnique({
    where: { confirmationToken },
    include: { event: { include: { tenant: true } } },
  });
  if (!reg) return null;
  if (reg.status === 'registered' || reg.status === 'waitlist') {
    return prisma.registration.update({
      where: { id: reg.id },
      data: { status: 'confirmed', confirmedAt: new Date() },
      include: { event: { include: { tenant: true } } },
    });
  }
  return reg;
}
