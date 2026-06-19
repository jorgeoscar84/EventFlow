import { prisma } from '../index';

/** Evento público por tenant+slug (solo publicado). PRD M4. */
export async function getPublicEvent(tenantSlug: string, eventSlug: string) {
  const event = await prisma.event.findFirst({
    where: {
      slug: eventSlug,
      tenant: { slug: tenantSlug },
      status: 'published',
      deletedAt: null,
    },
    include: {
      tenant: { select: { name: true, slug: true } },
      customFields: { orderBy: { order: 'asc' } },
      ticketTypes: true,
    },
  });
  if (!event) return null;

  const registeredCount = await prisma.registration.count({
    where: { eventId: event.id, status: { in: ['registered', 'confirmed', 'attended'] } },
  });

  return { event, registeredCount };
}

/** Próximos eventos publicados de un tenant (landing principal). */
export async function listPublicEvents(tenantSlug: string) {
  return prisma.event.findMany({
    where: {
      tenant: { slug: tenantSlug },
      status: 'published',
      visibility: 'public',
      deletedAt: null,
    },
    orderBy: { startsAt: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      type: true,
      startsAt: true,
      locationName: true,
      coverImageUrl: true,
    },
  });
}
