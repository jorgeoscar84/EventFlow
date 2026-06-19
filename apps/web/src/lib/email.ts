import 'server-only';
import nodemailer from 'nodemailer';

/**
 * Envío de email vía Amazon SES (SMTP), best-effort (PRD M7).
 * Si SES no está configurado, no falla: registra y continúa.
 */
function getTransporter() {
  const { SES_SMTP_HOST, SES_SMTP_USER, SES_SMTP_PASS } = process.env;
  if (!SES_SMTP_HOST || !SES_SMTP_USER || !SES_SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SES_SMTP_HOST,
    port: Number(process.env.SES_SMTP_PORT ?? 587),
    secure: false,
    auth: { user: SES_SMTP_USER, pass: SES_SMTP_PASS },
  });
}

interface ConfirmationEmailInput {
  to: string;
  name: string;
  eventTitle: string;
  passUrl: string;
  confirmUrl: string;
}

export async function sendConfirmationEmail(input: ConfirmationEmailInput): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[email] SES no configurado — se omite el envío de confirmación.');
    return false;
  }

  const from = process.env.MAIL_FROM_DEFAULT ?? 'Eventflow <no-reply@example.com>';
  const html = confirmationTemplate(input);

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: `Tu registro a ${input.eventTitle}`,
      html,
      text: `Hola ${input.name}, te registraste a ${input.eventTitle}. Tu pase: ${input.passUrl} · Confirma tu asistencia: ${input.confirmUrl}`,
    });
    return true;
  } catch (e) {
    console.error('[email] error enviando confirmación:', e);
    return false;
  }
}

function confirmationTemplate({ name, eventTitle, passUrl, confirmUrl }: ConfirmationEmailInput) {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#07070a;color:#ededf2;font-family:Inter,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;padding:40px 28px">
    <p style="font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#a5b4fc;margin:0 0 18px">Registro confirmado</p>
    <h1 style="font-size:28px;line-height:1.15;margin:0 0 12px">Hola ${escapeHtml(name)}, ¡ya estás dentro!</h1>
    <p style="color:#a1a1ac;font-size:15px;line-height:1.6;margin:0 0 24px">Te registraste a <strong style="color:#fff">${escapeHtml(eventTitle)}</strong>. Guarda tu pase con código QR para el acceso.</p>
    <a href="${passUrl}" style="display:inline-block;background:#fff;color:#07070a;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px">Ver mi pase</a>
    <div style="margin:28px 0;padding:18px;border:1px solid #ffffff1a;border-radius:14px">
      <p style="margin:0 0 8px;color:#a1a1ac;font-size:14px">¿Confirmas que asistirás? Ayúdanos a reservarte el lugar.</p>
      <a href="${confirmUrl}" style="color:#a5b4fc;font-size:14px;font-weight:600;text-decoration:none">Confirmar mi asistencia →</a>
    </div>
    <p style="color:#5b5b66;font-size:12px;margin-top:32px">Con tecnología de Eventflow</p>
  </div></body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
