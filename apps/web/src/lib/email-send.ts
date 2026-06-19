/**
 * Envío de email con Amazon SES (SMTP) — Nodemailer.
 * Archivo sin 'server-only' para que pueda ser usado en API routes y cron.
 * PRD/07 §7.3.
 */
import nodemailer from 'nodemailer';

interface SendInput {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST,
    port: Number(process.env.SES_SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SES_SMTP_USER,
      pass: process.env.SES_SMTP_PASS,
    },
  });
}

export async function sendEmail(input: SendInput): Promise<{ messageId: string }> {
  const t = createTransporter();
  const info = await t.sendMail(input);
  return { messageId: info.messageId };
}
