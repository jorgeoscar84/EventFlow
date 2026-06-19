import { prisma } from '../index';
import type { Prisma, RegistrationStatus } from '@prisma/client';

const PAID = ['paid', 'manual_paid'];

export interface RegistrationFilters {
  status?: RegistrationStatus;
  paid?: 'paid' | 'unpaid';
  q?: string;
  page?: number;
  pageSize?: number;
}

function isPaid(payments: { status: string }[]): boolean {
  return payments.some((p) => PAID.includes(p.status));
}

/** Tabla de registros filtrable (PRD M10). */
export async function listRegistrations(
  tenantId: string,
  eventId: string,
  filters: RegistrationFilters = {},
) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: { customFields: { orderBy: { order: 'asc' } } },
  });
  if (!event) return null;

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, filters.pageSize ?? 50));

  const where: Prisma.RegistrationWhereInput = {
    eventId,
    tenantId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.q
      ? {
          OR: [
            { fullName: { contains: filters.q, mode: 'insensitive' } },
            { email: { contains: filters.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.registration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { fieldValues: true, payments: { select: { status: true } } },
    }),
    prisma.registration.count({ where }),
  ]);

  const customFields = event.customFields.map((f) => ({ key: f.key, label: f.label, id: f.id }));

  let items = rows.map((r) => {
    const fields: Record<string, string> = {};
    for (const fv of r.fieldValues) {
      const cf = customFields.find((c) => c.id === fv.customFieldId);
      if (cf) fields[cf.key] = fv.value ?? '';
    }
    return {
      id: r.id,
      fullName: r.fullName,
      email: r.email,
      phone: r.phone,
      status: r.status,
      paid: isPaid(r.payments),
      checkedInAt: r.checkedInAt,
      checkinGate: r.checkinGate,
      createdAt: r.createdAt,
      fields,
    };
  });

  if (filters.paid) {
    items = items.filter((i) => (filters.paid === 'paid' ? i.paid : !i.paid));
  }

  return {
    items,
    customFields: customFields.map((c) => ({ key: c.key, label: c.label })),
    pagination: { page, pageSize, total },
  };
}

/** Construye filas para exportar (Excel/CSV) con TODOS los datos. PRD M10. */
export async function buildExport(tenantId: string, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenantId },
    include: { customFields: { orderBy: { order: 'asc' } } },
  });
  if (!event) return null;

  const regs = await prisma.registration.findMany({
    where: { eventId, tenantId },
    orderBy: { createdAt: 'asc' },
    include: { fieldValues: true, payments: { select: { status: true } } },
  });

  const cfs = event.customFields;
  const columns = [
    'Nombre',
    'Email',
    'Teléfono',
    'Estado',
    ...cfs.map((c) => c.label),
    'Pago',
    'Check-in',
    'Puerta',
    'Registrado',
  ];

  const statusLabel: Record<string, string> = {
    registered: 'Registrado',
    confirmed: 'Confirmado',
    attended: 'Asistió',
    no_show: 'No asistió',
    waitlist: 'Lista de espera',
    cancelled: 'Cancelado',
  };

  const rows = regs.map((r) => {
    const fvByCf = new Map(r.fieldValues.map((fv) => [fv.customFieldId, fv.value ?? '']));
    return [
      r.fullName,
      r.email,
      r.phone,
      statusLabel[r.status] ?? r.status,
      ...cfs.map((c) => fvByCf.get(c.id) ?? ''),
      isPaid(r.payments) ? 'Pagó' : 'No pagó',
      r.checkedInAt ? new Date(r.checkedInAt).toISOString() : '',
      r.checkinGate ?? '',
      new Date(r.createdAt).toISOString(),
    ];
  });

  return { title: event.title, columns, rows };
}

export function toCsv(columns: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}
