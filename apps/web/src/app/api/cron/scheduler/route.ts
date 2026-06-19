import { NextResponse } from 'next/server';
import { prisma, processDueJobs, materializeCampaign, type OutgoingMessage } from '@eventflow/db';
import { sendEmail } from '@/lib/email-send';

/**
 * Vercel Cron Job — reemplaza el proceso worker persistente (PRD/07, PRD/13).
 * Se ejecuta según el schedule de vercel.json (cada 2 min en Pro, ajustable).
 *
 * Seguridad: Vercel inyecta Authorization: Bearer <CRON_SECRET>.
 * En desarrollo se puede invocar manualmente: GET /api/cron/scheduler
 */
export async function GET(req: Request) {
  // Verificar token de cron en producción.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization');
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  const start = Date.now();
  try {
    // 1) Materializar campañas programadas (crea message_jobs para los destinatarios).
    const campaigns = await prisma.messageCampaign.findMany({
      where: { status: 'scheduled' },
      select: { id: true },
    });
    let materialized = 0;
    for (const c of campaigns) {
      const n = await materializeCampaign(c.id);
      materialized += n;
    }

    // 2) Procesar envíos vencidos (best-effort por Amazon SES).
    const sendFn = async (msg: OutgoingMessage) => {
      const { SES_SMTP_USER, SES_SMTP_PASS, SES_SMTP_HOST, MAIL_FROM_DEFAULT } = process.env;
      if (!SES_SMTP_USER || !SES_SMTP_PASS || !SES_SMTP_HOST) {
        return { ok: false, error: 'SES no configurado' };
      }
      try {
        const { messageId } = await sendEmail({
          to: msg.to,
          from: MAIL_FROM_DEFAULT ?? 'Eventflow <no-reply@example.com>',
          subject: msg.subject,
          text: msg.text,
          html: `<p style="font-family:Inter,Arial,sans-serif">${msg.text.replace(/\n/g, '<br>')}</p>`,
        });
        return { ok: true, providerMessageId: messageId };
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    };

    const result = await processDueJobs(sendFn);
    const elapsed = Date.now() - start;

    console.log('[cron/scheduler]', { materialized, ...result, ms: elapsed });
    return NextResponse.json({ ok: true, materialized, ...result, ms: elapsed });
  } catch (e) {
    console.error('[cron/scheduler] error:', e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
