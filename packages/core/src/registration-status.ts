/** Máquina de estados del funnel de asistentes. PRD/04 §4.5, PRD/05 M5/M6/M8. */

export type RegistrationStatus =
  | 'registered'
  | 'confirmed'
  | 'waitlist'
  | 'cancelled'
  | 'attended'
  | 'no_show';

/** Transiciones permitidas. Cualquier otra debe rechazarse en la capa de servicio. */
const TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  registered: ['confirmed', 'cancelled', 'waitlist', 'attended', 'no_show'],
  confirmed: ['attended', 'cancelled', 'no_show'],
  waitlist: ['registered', 'cancelled'],
  cancelled: [],
  attended: [],
  no_show: [],
};

export function canTransition(from: RegistrationStatus, to: RegistrationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export interface FunnelCounts {
  registered: number;
  confirmed: number;
  attended: number;
  noShow: number;
}

/** Tasa de asistencia sobre confirmados (objetivo OB-1 del PRD). */
export function attendanceRate(counts: FunnelCounts): number {
  if (counts.confirmed === 0) return 0;
  return counts.attended / counts.confirmed;
}
