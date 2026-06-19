import { prisma } from '../index';

export type ScanResult = 'ok' | 'duplicate' | 'invalid' | 'not_confirmed';

export interface ScanOutcome {
  result: ScanResult;
  attendee?: {
    fullName: string;
    email: string;
    status: string;
    checkedInAt?: Date | null;
  };
}

/**
 * Procesa un escaneo de QR en la puerta (PRD M8).
 * - invalid: token inexistente o de otro evento
 * - duplicate: ya tenía check-in
 * - not_confirmed: entra pero no había confirmado (evento que lo exige)
 * - ok: acceso correcto
 * Registra siempre un attendance_log con el resultado.
 */
export async function scanCheckin(params: {
  tenantId: string;
  eventId: string;
  qrToken: string;
  scannedById?: string | null;
  gate?: string | null;
}): Promise<ScanOutcome> {
  const { tenantId, eventId, qrToken, scannedById, gate } = params;

  const reg = await prisma.registration.findUnique({
    where: { qrToken },
    include: { event: { select: { id: true, requiresConfirmation: true } } },
  });

  // Token inválido, de otro evento o de otro tenant.
  if (!reg || reg.eventId !== eventId || reg.tenantId !== tenantId) {
    await prisma.attendanceLog.create({
      data: { eventId, scannedById: scannedById ?? null, gate: gate ?? null, result: 'invalid' },
    });
    return { result: 'invalid' };
  }

  const attendee = { fullName: reg.fullName, email: reg.email, status: reg.status };

  // Ya ingresó.
  if (reg.checkedInAt) {
    await prisma.attendanceLog.create({
      data: {
        eventId,
        registrationId: reg.id,
        scannedById: scannedById ?? null,
        gate: gate ?? null,
        result: 'duplicate',
      },
    });
    return { result: 'duplicate', attendee: { ...attendee, checkedInAt: reg.checkedInAt } };
  }

  const notConfirmed = reg.event.requiresConfirmation && reg.status !== 'confirmed';
  const result: ScanResult = notConfirmed ? 'not_confirmed' : 'ok';

  await prisma.$transaction([
    prisma.registration.update({
      where: { id: reg.id },
      data: {
        status: 'attended',
        checkedInAt: new Date(),
        checkedInById: scannedById ?? null,
        checkinGate: gate ?? null,
      },
    }),
    prisma.attendanceLog.create({
      data: {
        eventId,
        registrationId: reg.id,
        scannedById: scannedById ?? null,
        gate: gate ?? null,
        result,
      },
    }),
  ]);

  return { result, attendee: { ...attendee, status: 'attended' } };
}

/** Estadísticas de check-in en vivo (PRD M8). */
export async function getCheckinStats(tenantId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    select: { id: true, title: true, capacity: true },
  });
  if (!event) return null;

  const [attended, confirmed, total] = await Promise.all([
    prisma.registration.count({ where: { eventId, status: 'attended' } }),
    prisma.registration.count({ where: { eventId, status: 'confirmed' } }),
    prisma.registration.count({
      where: { eventId, status: { in: ['registered', 'confirmed', 'attended', 'waitlist'] } },
    }),
  ]);

  return { event, attended, confirmed, total };
}

/** Eventos que un usuario puede escanear (de su tenant, activos). */
export async function listScannableEvents(tenantId: string) {
  return prisma.event.findMany({
    where: { tenantId, status: { in: ['published', 'finished'] }, deletedAt: null },
    orderBy: { startsAt: 'desc' },
    select: { id: true, title: true, startsAt: true, type: true, locationName: true },
  });
}
