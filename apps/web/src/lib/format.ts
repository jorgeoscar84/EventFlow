/** Formateo de fechas en español con zona horaria del evento. */
export function formatEventDate(date: Date | string, timezone?: string): string {
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  }).format(new Date(date));
}

export function formatEventTime(date: Date | string, timezone?: string): string {
  return new Intl.DateTimeFormat('es', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  }).format(new Date(date));
}

export const eventTypeLabel: Record<string, string> = {
  in_person: 'Presencial',
  digital: 'Online',
  hybrid: 'Híbrido',
};
