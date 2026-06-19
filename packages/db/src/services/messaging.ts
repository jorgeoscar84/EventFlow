import { prisma } from '../index';
import type { MessageChannel, CampaignTriggerType, Prisma } from '@prisma/client';

/** Plantillas por defecto (PRD/07 §7.4). Variables: {{name}}, {{event_title}}, etc. */
export const DEFAULT_TEMPLATES: Record<
  string,
  { subject: string; body: string; audience: string[]; offsetMinutes: number }
> = {
  reconfirm: {
    subject: 'Confirma tu asistencia a {{event_title}}',
    body: 'Hola {{name}}, falta poco para {{event_title}} ({{event_date}}). Los cupos son limitados: confirma tu asistencia para no perder tu lugar. Confirmar: {{confirm_url}}',
    audience: ['registered'],
    offsetMinutes: -2880, // 48h antes
  },
  reminder_24h: {
    subject: 'Mañana es {{event_title}} 🎟️',
    body: 'Hola {{name}}, te esperamos en {{event_title}} el {{event_date}}. Lugar/acceso: {{location}}. Tu pase: {{pass_url}}',
    audience: ['confirmed'],
    offsetMinutes: -1440, // 24h antes
  },
  reminder_1h: {
    subject: '{{event_title}} comienza pronto',
    body: 'Hola {{name}}, {{event_title}} empieza en 1 hora. Acceso: {{location}}. Tu pase: {{pass_url}}',
    audience: ['confirmed'],
    offsetMinutes: -60, // 1h antes
  },
  thank_you: {
    subject: 'Gracias por asistir a {{event_title}}',
    body: 'Hola {{name}}, ¡gracias por acompañarnos en {{event_title}}! Pronto compartiremos novedades.',
    audience: ['attended'],
    offsetMinutes: 720, // 12h después del inicio
  },
};

export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
}

export interface CreateCampaignInput {
  eventId: string;
  name: string;
  channel?: MessageChannel;
  templateKey: string;
  triggerType: CampaignTriggerType;
  offsetMinutes?: number | null;
  scheduledAt?: Date | null;
  audienceFilter: { status: string[] };
}

export async function createCampaign(tenantId: string, input: CreateCampaignInput) {
  return prisma.messageCampaign.create({
    data: {
      tenantId,
      eventId: input.eventId,
      name: input.name,
      channel: input.channel ?? 'email',
      templateKey: input.templateKey,
      triggerType: input.triggerType,
      offsetMinutes: input.offsetMinutes ?? null,
      scheduledAt: input.scheduledAt ?? null,
      audienceFilter: input.audienceFilter,
      status: 'scheduled',
    },
  });
}

/** Crea el set de campañas estándar para un evento (al publicar). Idempotente por (templateKey). */
export async function setupDefaultCampaigns(tenantId: string, eventId: string) {
  const created: string[] = [];
  for (const [key, def] of Object.entries(DEFAULT_TEMPLATES)) {
    const exists = await prisma.messageCampaign.findFirst({
      where: { eventId, templateKey: key },
      select: { id: true },
    });
    if (exists) continue;
    await createCampaign(tenantId, {
      eventId,
      name: key,
      templateKey: key,
      triggerType: 'relative_to_event',
      offsetMinutes: def.offsetMinutes,
      audienceFilter: { status: def.audience },
    });
    created.push(key);
  }
  return created;
}

/** Materializa una campaña: calcula destinatarios y crea message_jobs pendientes. */
export async function materializeCampaign(campaignId: string): Promise<number> {
  const campaign = await prisma.messageCampaign.findUnique({
    where: { id: campaignId },
    include: { event: { select: { startsAt: true } } },
  });
  if (!campaign) return 0;

  const scheduledFor =
    campaign.triggerType === 'scheduled_absolute' && campaign.scheduledAt
      ? campaign.scheduledAt
      : new Date(campaign.event.startsAt.getTime() + (campaign.offsetMinutes ?? 0) * 60000);

  const statuses = (campaign.audienceFilter as { status?: string[] })?.status ?? ['registered'];

  const recipients = await prisma.registration.findMany({
    where: { eventId: campaign.eventId, status: { in: statuses as Prisma.EnumRegistrationStatusFilter['in'] } },
    select: { id: true },
  });

  let created = 0;
  for (const r of recipients) {
    try {
      await prisma.messageJob.create({
        data: {
          campaignId: campaign.id,
          registrationId: r.id,
          channel: campaign.channel,
          scheduledFor,
          status: 'queued',
        },
      });
      created += 1;
    } catch {
      // unique (campaignId, registrationId) -> ya existe, se omite.
    }
  }
  return created;
}

export interface OutgoingMessage {
  to: string;
  subject: string;
  text: string;
  registrationId: string;
  channel: MessageChannel;
}
export type SendFn = (msg: OutgoingMessage) => Promise<{ ok: boolean; providerMessageId?: string; error?: string }>;

/** Procesa los jobs vencidos (scheduler). Devuelve métricas. PRD/07 §7.6. */
export async function processDueJobs(sendFn: SendFn, now = new Date(), limit = 200) {
  const base = process.env.APP_BASE_URL ?? '';
  const jobs = await prisma.messageJob.findMany({
    where: { status: 'queued', scheduledFor: { lte: now } },
    take: limit,
    include: {
      campaign: { include: { event: { include: { tenant: { select: { name: true } } } } } },
    },
  });

  let sent = 0;
  let failed = 0;
  for (const job of jobs) {
    const reg = await prisma.registration.findUnique({ where: { id: job.registrationId } });
    if (!reg) {
      await prisma.messageJob.update({ where: { id: job.id }, data: { status: 'skipped' } });
      continue;
    }
    const ev = job.campaign.event;
    const def = DEFAULT_TEMPLATES[job.campaign.templateKey];
    const vars: Record<string, string> = {
      name: reg.fullName.split(' ')[0] ?? reg.fullName,
      event_title: ev.title,
      event_date: new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short', timeZone: ev.timezone }).format(ev.startsAt),
      location: ev.type === 'digital' ? (ev.onlineUrl ?? 'Online') : (ev.locationName ?? ''),
      online_url: ev.onlineUrl ?? '',
      confirm_url: `${base}/confirmar/${reg.confirmationToken}`,
      pass_url: `${base}/pase/${reg.qrToken}`,
    };
    const subject = renderTemplate(def?.subject ?? job.campaign.name, vars);
    const text = renderTemplate(def?.body ?? '', vars);

    const res = await sendFn({ to: reg.email, subject, text, registrationId: reg.id, channel: job.channel });

    await prisma.$transaction([
      prisma.messageJob.update({
        where: { id: job.id },
        data: { status: res.ok ? 'sent' : 'failed', attempts: { increment: 1 }, lastError: res.error ?? null },
      }),
      prisma.messageLog.create({
        data: {
          registrationId: reg.id,
          campaignId: job.campaignId,
          jobId: job.id,
          channel: job.channel,
          templateKey: job.campaign.templateKey,
          providerMessageId: res.providerMessageId ?? null,
          status: res.ok ? 'sent' : 'failed',
        },
      }),
    ]);
    res.ok ? (sent += 1) : (failed += 1);
  }
  return { processed: jobs.length, sent, failed };
}

export async function listCampaigns(tenantId: string, eventId: string) {
  return prisma.messageCampaign.findMany({
    where: { tenantId, eventId },
    orderBy: { offsetMinutes: 'asc' },
    include: { _count: { select: { jobs: true } } },
  });
}
