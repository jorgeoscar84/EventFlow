import { Queue, type ConnectionOptions } from 'bullmq';

/** Opciones de conexión Redis para BullMQ (PRD/03, PRD/07). */
function parseRedisUrl(url: string): ConnectionOptions {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 6379),
    username: u.username || undefined,
    password: u.password || undefined,
    maxRetriesPerRequest: null,
  };
}

export const connection: ConnectionOptions = parseRedisUrl(
  process.env.REDIS_URL ?? 'redis://localhost:6379',
);

export const QUEUE_MESSAGES = 'messages';

/** Payload de un job de mensaje (1 destinatario). PRD/04 §4.7 message_jobs. */
export interface MessageJobData {
  jobId: string;
  campaignId: string;
  registrationId: string;
  channel: 'email' | 'whatsapp' | 'sms';
  templateKey: string;
  tenantId: string;
}

export const messagesQueue = new Queue<MessageJobData>(QUEUE_MESSAGES, { connection });
