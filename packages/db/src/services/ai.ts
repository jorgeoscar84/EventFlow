import { prisma } from '../index';
import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';

/**
 * Asistente IA conversacional (PRD M14 / doc 12).
 * RAG sobre pgvector con guardarraíles anti-alucinación: el agente sólo responde
 * con conocimiento recuperado + datos del evento; si no hay match confiable, lo admite.
 *
 * Embeddings: si LLM_API_KEY está configurado se usaría el proveedor (hook listo);
 * por defecto se usa un embedding local determinista (bag-of-words hasheado),
 * suficiente para recuperación por solapamiento de términos y 100% offline.
 */
const DIM = 1536;
const MATCH_THRESHOLD = 0.18;

function fnv(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function tokenize(text: string): string[] {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .match(/[a-z0-9]+/g) ?? []
  );
}

export function embedLocal(text: string): number[] {
  const v = new Array<number>(DIM).fill(0);
  const tokens = tokenize(text);
  for (const t of tokens) {
    const i1 = fnv(t) % DIM;
    v[i1] = (v[i1] ?? 0) + 1;
    const i2 = fnv('b_' + t) % DIM;
    v[i2] = (v[i2] ?? 0) + 0.5;
  }
  const norm = Math.sqrt(v.reduce((a, b) => a + b * b, 0)) || 1;
  return v.map((x) => x / norm);
}

function toVectorLiteral(v: number[]): string {
  return `[${v.join(',')}]`;
}

// ───────── Configuración (herencia tenant → evento) ─────────

export interface EffectiveAgentConfig {
  enabled: boolean;
  displayName: string;
  welcomeMessage: string;
  persona: string | null;
  fallbackMessage: string;
}

const DEFAULT_FALLBACK =
  'No tengo esa información con certeza. ¿Quieres que un organizador te contacte o ver los detalles del evento?';

export async function getEffectiveAgentConfig(
  tenantId: string,
  eventId: string,
): Promise<EffectiveAgentConfig> {
  const [tenantCfg, eventCfg] = await Promise.all([
    prisma.aiAgentConfig.findFirst({ where: { tenantId, scope: 'tenant' } }),
    prisma.aiAgentConfig.findFirst({ where: { tenantId, scope: 'event', eventId } }),
  ]);
  const pick = <T>(ev: T | null | undefined, tn: T | null | undefined, def: T): T =>
    ev ?? tn ?? def;
  const enabled = eventCfg?.enabled ?? tenantCfg?.enabled ?? false;
  return {
    enabled,
    displayName: pick(eventCfg?.displayName, tenantCfg?.displayName, 'Asistente'),
    welcomeMessage: pick(
      eventCfg?.welcomeMessage,
      tenantCfg?.welcomeMessage,
      '¡Hola! ¿En qué puedo ayudarte con este evento?',
    ),
    persona: pick(eventCfg?.persona, tenantCfg?.persona, null),
    fallbackMessage: pick(
      (eventCfg?.fallbackBehavior as { message?: string } | null)?.message,
      (tenantCfg?.fallbackBehavior as { message?: string } | null)?.message,
      DEFAULT_FALLBACK,
    ),
  };
}

export async function setEventAgentEnabled(tenantId: string, eventId: string, enabled: boolean) {
  return prisma.aiAgentConfig.upsert({
    where: { tenantId_scope_eventId: { tenantId, scope: 'event', eventId } },
    update: { enabled },
    create: { tenantId, scope: 'event', eventId, enabled },
  });
}

// ───────── Ingesta de conocimiento ─────────

async function indexChunk(params: {
  tenantId: string;
  eventId: string;
  sourceId: string;
  content: string;
}) {
  const id = randomUUID();
  await prisma.aiKnowledgeChunk.create({
    data: {
      id,
      tenantId: params.tenantId,
      eventId: params.eventId,
      sourceId: params.sourceId,
      content: params.content,
      tokenCount: tokenize(params.content).length,
    },
  });
  const vec = toVectorLiteral(embedLocal(params.content));
  await prisma.$executeRawUnsafe(
    `UPDATE "AiKnowledgeChunk" SET embedding = $1::vector WHERE id = $2::uuid`,
    vec,
    id,
  );
}

/** Genera/actualiza el conocimiento automático a partir de los datos del evento. */
export async function ingestEventKnowledge(tenantId: string, eventId: string): Promise<number> {
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) return 0;

  // Reemplaza la fuente auto_event previa.
  const prev = await prisma.aiKnowledgeSource.findFirst({
    where: { tenantId, eventId, type: 'auto_event' },
  });
  if (prev) {
    await prisma.aiKnowledgeChunk.deleteMany({ where: { sourceId: prev.id } });
    await prisma.aiKnowledgeSource.delete({ where: { id: prev.id } });
  }

  const source = await prisma.aiKnowledgeSource.create({
    data: { tenantId, eventId, type: 'auto_event', title: 'Datos del evento', status: 'active', lastIndexedAt: new Date() },
  });

  const fecha = new Intl.DateTimeFormat('es', { dateStyle: 'full', timeStyle: 'short', timeZone: event.timezone }).format(event.startsAt);
  const facts: string[] = [
    `Nombre del evento: ${event.title}.`,
    event.description ? `De qué trata: ${event.description}` : '',
    `¿Cuándo es? Fecha y hora del evento: ${fecha} (zona horaria ${event.timezone}).`,
    event.type === 'digital'
      ? '¿Dónde es? Es un evento online/virtual. El enlace de acceso se envía por correo al confirmar la asistencia.'
      : `¿Dónde es? Ubicación y lugar del evento: ${event.locationName ?? 'por confirmar'}${event.locationAddress ? ', dirección ' + event.locationAddress : ''}.`,
    event.capacity ? `¿Cuántos cupos hay? Aforo y capacidad: ${event.capacity} personas.` : '',
    event.requiresConfirmation ? '¿Cómo aseguro mi lugar? Debes confirmar tu asistencia tras registrarte.' : '',
    '¿Cómo me registro o inscribo? Para asistir necesitas registrarte; recibirás un pase con código QR para la entrada.',
    `¿Cuánto cuesta? ${event.requiresPayment ? 'Este evento requiere pago según el tipo de entrada.' : 'El registro a este evento es gratuito.'}`,
  ].filter(Boolean);

  for (const f of facts) await indexChunk({ tenantId, eventId, sourceId: source.id, content: f });
  return facts.length;
}

export async function addFaq(tenantId: string, eventId: string, question: string, answer: string) {
  const source = await prisma.aiKnowledgeSource.create({
    data: { tenantId, eventId, type: 'faq', title: question.slice(0, 80), status: 'active', lastIndexedAt: new Date() },
  });
  await indexChunk({ tenantId, eventId, sourceId: source.id, content: `Pregunta: ${question}\nRespuesta: ${answer}` });
  return source;
}

export async function listKnowledge(tenantId: string, eventId: string) {
  return prisma.aiKnowledgeSource.findMany({
    where: { tenantId, eventId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { chunks: true } } },
  });
}

// ───────── Recuperación + chat ─────────

interface RetrievedChunk {
  content: string;
  score: number;
}

export async function retrieve(
  tenantId: string,
  eventId: string,
  query: string,
  k = 4,
): Promise<RetrievedChunk[]> {
  const vec = toVectorLiteral(embedLocal(query));
  const rows = await prisma.$queryRawUnsafe<{ content: string; score: number }[]>(
    `SELECT content, 1 - (embedding <=> $1::vector) AS score
     FROM "AiKnowledgeChunk"
     WHERE "tenantId" = $2::uuid AND "eventId" = $3::uuid AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $4::int`,
    vec,
    tenantId,
    eventId,
    k,
  );
  return rows.map((r) => ({ content: r.content, score: Number(r.score) }));
}

export interface ChatResult {
  conversationId: string;
  reply: string;
  grounded: boolean;
  sources: string[];
}

/**
 * Responde una pregunta con RAG + guardarraíles. Sin match confiable → fallback honesto.
 * Modo extractivo (sin LLM): compone la respuesta con los fragmentos recuperados.
 */
export async function chat(params: {
  tenantId: string;
  eventId: string;
  message: string;
  conversationId?: string;
}): Promise<ChatResult> {
  const cfg = await getEffectiveAgentConfig(params.tenantId, params.eventId);
  const hits = await retrieve(params.tenantId, params.eventId, params.message);
  const top = hits[0];
  const grounded = !!top && top.score >= MATCH_THRESHOLD;

  const reply = grounded
    ? hits
        .filter((h) => h.score >= MATCH_THRESHOLD)
        .slice(0, 2)
        .map((h) => h.content.replace(/^Pregunta:.*\nRespuesta:\s*/s, ''))
        .join(' ')
    : cfg.fallbackMessage;

  // Persistencia de la conversación + uso.
  let conversationId = params.conversationId;
  if (!conversationId) {
    const conv = await prisma.aiConversation.create({
      data: { tenantId: params.tenantId, eventId: params.eventId, channel: 'web' },
    });
    conversationId = conv.id;
  }
  await prisma.aiMessage.createMany({
    data: [
      { conversationId, role: 'user', content: params.message, tokensIn: tokenize(params.message).length },
      { conversationId, role: 'assistant', content: reply, tokensOut: tokenize(reply).length, retrievedSources: hits.map((h) => h.score) as Prisma.InputJsonValue },
    ],
  });
  await prisma.aiConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } });

  const period = new Date().toISOString().slice(0, 7);
  await prisma.aiUsage.upsert({
    where: { tenantId_period: { tenantId: params.tenantId, period } },
    update: { messages: { increment: 1 }, tokensIn: { increment: tokenize(params.message).length }, tokensOut: { increment: tokenize(reply).length } },
    create: { tenantId: params.tenantId, period, messages: 1, tokensIn: tokenize(params.message).length, tokensOut: tokenize(reply).length },
  });

  return { conversationId, reply, grounded, sources: hits.map((h) => h.content.slice(0, 60)) };
}
