import nodemailer from 'nodemailer';

/**
 * Proveedor de email vía Amazon SES (SMTP). PRD/07 §7.3.
 * El remitente real se resuelve por tenant (smtp_settings); aquí va el transport base.
 */
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SES_SMTP_HOST,
    port: Number(process.env.SES_SMTP_PORT ?? 587),
    secure: false,
    auth: {
      user: process.env.SES_SMTP_USER,
      pass: process.env.SES_SMTP_PASS,
    },
  });
  return transporter;
}

export interface SendEmailInput {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ messageId: string }> {
  const info = await getTransporter().sendMail(input);
  return { messageId: info.messageId };
}
