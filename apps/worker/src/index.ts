import { Worker } from 'bullmq';
import { connection, QUEUE_MESSAGES, type MessageJobData } from './queues';

/**
 * Worker de mensajería (PRD/07). Consume `message_jobs` y envía por el canal.
 * Stub de Fase 0: estructura lista; la lógica de renderizado de plantillas,
 * resolución de remitente por tenant y escritura de message_logs se implementa en Fase 4.
 */
const worker = new Worker<MessageJobData>(
  QUEUE_MESSAGES,
  async (job) => {
    const { channel, templateKey, registrationId } = job.data;
    // TODO Fase 4: cargar plantilla + datos del registro, renderizar, enviar y loguear.
    console.log(
      `[worker] procesando job ${job.id} · canal=${channel} · plantilla=${templateKey} · registro=${registrationId}`,
    );
    return { ok: true };
  },
  { connection, concurrency: 10 },
);

worker.on('completed', (job) => console.log(`[worker] job ${job.id} completado`));
worker.on('failed', (job, err) => console.error(`[worker] job ${job?.id} falló:`, err.message));

console.log('[worker] Eventflow worker iniciado. Escuchando cola:', QUEUE_MESSAGES);

async function shutdown() {
  console.log('[worker] cerrando...');
  await worker.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
