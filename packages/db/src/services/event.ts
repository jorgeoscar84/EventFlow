import { prisma } from '../index';
import type { Prisma, EventStatus, EventType } from '@prisma/client';
import { isValidSlug } from '@eventflow/core';
import { setupDefaultCampaigns } from './messaging';
import { assertCanCreateEvent } from './plan';

/** Genera un slug a partir de un título. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Asegura un slug único por tenant añadiendo sufijo numérico si hace falta. */
async function uniqueSlug(tenantId: string, base: string): Promise<string> {
  let slug = base || 'evento';
  if (!isValidSlug(slug)) slug = 'evento';
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.event.findFirst({
      where: { tenantId, slug },
      select: { id: true },
    });
    if (!exists) return slug;
    n += 1;
    slug = `${base}-${n}`.slice(0, 62);
  }
}

export interface CreateEventData {
  title: string;
  type: EventType;
  startsAt: Date;
  endsAt: Date;
  timezone?: string;
  description?: string;
  capacity?: number | null;
  locationName?: string;
  locationAddress?: string;
  onlineUrl?: string;
  requiresPayment?: boolean;
  requiresConfirmation?: boolean;
  confirmationDeadlineHours?: number;
}

export async function createEvent(tenantId: string, data: CreateEventData) {
  await assertCanCreateEvent(tenantId);
  const slug = await uniqueSlug(tenantId, slugify(data.title));
  return prisma.event.create({
    data: {
      tenantId,
      slug,
      title: data.title,
      type: data.type,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
      timezone: data.timezone ?? 'UTC',
      description: data.description ?? null,
      capacity: data.capacity ?? null,
      locationName: data.locationName ?? null,
      locationAddress: data.locationAddress ?? null,
      onlineUrl: data.onlineUrl ?? null,
      requiresPayment: data.requiresPayment ?? false,
      requiresConfirmation: data.requiresConfirmation ?? true,
      confirmationDeadlineHours: data.confirmationDeadlineHours ?? 24,
      status: 'draft',
    },
  });
}

export interface ListEventsFilters {
  status?: EventStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function listEvents(tenantId: string, filters: ListEventsFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const where: Prisma.EventWhereInput = {
    tenantId,
    deletedAt: null,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q ? { title: { contains: filters.q, mode: 'insensitive' } } : {}),
  };
  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy: { startsAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.event.count({ where }),
  ]);
  return { items, pagination: { page, pageSize, total } };
}

export async function getEvent(tenantId: string, idOrSlug: string) {
  return prisma.event.findFirst({
    where: { tenantId, deletedAt: null, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { customFields: true, ticketTypes: true },
  });
}

export async function updateEvent(
  tenantId: string,
  id: string,
  data: Partial<CreateEventData>,
) {
  // Garantiza pertenencia al tenant antes de actualizar.
  const existing = await prisma.event.findFirst({ where: { tenantId, id }, select: { id: true } });
  if (!existing) return null;
  return prisma.event.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.startsAt !== undefined ? { startsAt: data.startsAt } : {}),
      ...(data.endsAt !== undefined ? { endsAt: data.endsAt } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      ...(data.locationName !== undefined ? { locationName: data.locationName } : {}),
      ...(data.onlineUrl !== undefined ? { onlineUrl: data.onlineUrl } : {}),
    },
  });
}

export async function publishEvent(tenantId: string, id: string) {
  const existing = await prisma.event.findFirst({ where: { tenantId, id }, select: { id: true } });
  if (!existing) return null;
  const event = await prisma.event.update({
    where: { id },
    data: { status: 'published', publishedAt: new Date() },
  });
  // Crea las campañas estándar (reconfirmación + recordatorios + agradecimiento).
  await setupDefaultCampaigns(tenantId, id);
  return event;
}

/** Funnel de un evento: registrados / confirmados / asistieron / no-show. PRD M10. */
export async function getEventStats(tenantId: string, id: string) {
  const event = await prisma.event.findFirst({ where: { tenantId, id }, select: { id: true } });
  if (!event) return null;
  const grouped = await prisma.registration.groupBy({
    by: ['status'],
    where: { eventId: id, tenantId },
    _count: { _all: true },
  });
  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all]));
  return {
    registered: counts.registered ?? 0,
    confirmed: counts.confirmed ?? 0,
    attended: counts.attended ?? 0,
    noShow: counts.no_show ?? 0,
    waitlist: counts.waitlist ?? 0,
    cancelled: counts.cancelled ?? 0,
  };
}
