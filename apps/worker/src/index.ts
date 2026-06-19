import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Carga el .env de la raíz del monorepo.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

import { prisma, processDueJobs, materializeCampaign, type OutgoingMessage } from '@eventflow/db';
import { sendEmail } from './channels/email';

/**
 * Worker de mensajería — scheduler por sondeo de base de datos (PRD/07).
 * Mejora vs. BullMQ/Redis: el motor de recordatorios sólo necesita DB + SES,
 * sin Redis. Cada minuto: re-materializa campañas programadas y procesa
 * los envíos vencidos (best-effort por Amazon SES).
 */
const send = async (msg: OutgoingMessage) => {
  if (!process.env.SES_SMTP_USER) return { ok: false, error: 'SES no configurado' };
  try {
    const from = process.env.MAIL_FROM_DEFAULT ?? 'Eventflow <no-reply@example.com>';
    const { messageId } = await sendEmail({
      to: msg.to,
      from,
      subject: msg.subject,
      text: msg.text,
      html: `<p>${msg.text}</p>`,
    });
    return { ok: true, providerMessageId: messageId };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
};

let running = false;
async function tick() {
  if (running) return;
  running = true;
  try {
    const campaigns = await prisma.messageCampaign.findMany({
      where: { status: 'scheduled' },
      select: { id: true },
    });
    for (const c of campaigns) await materializeCampaign(c.id);

    const res = await processDueJobs(send);
    if (res.processed > 0) console.log('[scheduler]', res);
  } catch (e) {
    console.error('[scheduler] error:', e);
  } finally {
    running = false;
  }
}

console.log('[worker] Scheduler de mensajería iniciado (sondeo cada 60s).');
void tick();
const interval = setInterval(() => void tick(), 60_000);

function shutdown() {
  clearInterval(interval);
  void prisma.$disconnect();
  process.exit(0);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
