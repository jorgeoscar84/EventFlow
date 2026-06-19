import { prisma } from '../index';
import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import type { Prisma } from '@prisma/client';

/**
 * Asistente IA conversacional (PRD M14 / doc 12 + 13).
 *
 * Modos de operación:
 * 1. EXTRACTIVO (por defecto / sin LLM): responde con los fragmentos recuperados.
 *    Funciona offline, sin API key. Guardarraíl: sin match → fallback honesto.
 *
 * 2. CONVERSACIONAL (con LLM configurado): usa cualquier proveedor OpenAI-compatible
 *    (OpenRouter, OpenAI, Azure OpenAI, Ollama local, etc.) con los fragmentos como
 *    contexto del sistema. El LLM NO puede alucinar: sólo ve el contexto recuperado.
 *
 * Configuración: tabla `integrations` del tenant, tipo `llm_openai_compatible`.
 * Editable desde /dashboard/settings → "Inteligencia Artificial".
 */

// ───────── Embeddings locales (siempre disponibles) ─────────
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

// ───────── Configuración LLM del tenant ─────────

export interface LlmConfig {
  baseUrl: string;       // ej. https://openrouter.ai/api/v1
  apiKey: string;        // clave del proveedor
  model: string;         // ej. gpt-4o-mini, anthropic/claude-3.5-sonnet
  embeddingModel?: string; // opcional; fallback a embedLocal si no hay
  maxTokens?: number;
  temperature?: number;
}

export async function getTenantLlmConfig(tenantId: string): Promise<LlmConfig | null> {
  const integration = await prisma.integration.findFirst({
    where: { tenantId, type: 'llm_openai_compatible', isActive: true },
  });
  if (!integration) return null;
  const cfg = integration.config as unknown as LlmConfig;
  if (!cfg.apiKey || !cfg.model || !cfg.baseUrl) return null;
  return cfg;
}

export async function saveTenantLlmConfig(tenantId: string, config: LlmConfig | null) {
  if (!config) {
    await prisma.integration.updateMany({
      where: { tenantId, type: 'llm_openai_compatible' },
      data: { isActive: false },
    });
    return;
  }
  const configJson = config as unknown as Prisma.InputJsonValue;
  await prisma.integration.upsert({
    where: { tenantId_type: { tenantId, type: 'llm_openai_compatible' } },
    update: { config: configJson, isActive: true },
    create: {
      tenantId,
      type: 'llm_openai_compatible',
      config: configJson,
      isActive: true,
    },
  });
}

function buildLlmClient(cfg: LlmConfig): OpenAI {
  return new OpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseUrl,
    defaultHeaders: {
      // OpenRouter requiere estas cabeceras opcionales para rastreo y ranking.
      'HTTP-Referer': 'https://eventflow.app',
      'X-Title': 'Eventflow Assistant',
    },
  });
}

// ───────── Presets de proveedores conocidos ─────────

export const LLM_PRESETS: { name: string; baseUrl: string; exampleModel: string }[] = [
  { name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', exampleModel: 'openai/gpt-4o-mini' },
  { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', exampleModel: 'gpt-4o-mini' },
  { name: 'Azure OpenAI', baseUrl: 'https://{resource}.openai.azure.com/openai/deployments/{deployment}', exampleModel: 'gpt-4o' },
  { name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', exampleModel: 'llama-3.3-70b-versatile' },
  { name: 'Ollama (local)', baseUrl: 'http://localhost:11434/v1', exampleModel: 'llama3.2' },
];

// ───────── Configuración del agente (herencia tenant → evento) ─────────

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

export async function ingestEventKnowledge(tenantId: string, eventId: string): Promise<number> {
  const event = await prisma.event.findFirst({ where: { id: eventId, tenantId } });
  if (!event) return 0;

  const prev = await prisma.aiKnowledgeSource.findFirst({
    where: { tenantId, eventId, type: 'auto_event' },
  });
  if (prev) {
    await prisma.aiKnowledgeChunk.deleteMany({ where: { sourceId: prev.id } });
    await prisma.aiKnowledgeSource.delete({ where: { id: prev.id } });
  }

  const source = await prisma.aiKnowledgeSource.create({
    data: {
      tenantId, eventId, type: 'auto_event',
      title: 'Datos del evento', status: 'active', lastIndexedAt: new Date(),
    },
  });

  const fecha = new Intl.DateTimeFormat('es', {
    dateStyle: 'full', timeStyle: 'short', timeZone: event.timezone,
  }).format(event.startsAt);

  const facts: string[] = [
    `Nombre del evento: ${event.title}.`,
    event.description ? `De qué trata: ${event.description}` : '',
    `¿Cuándo es? Fecha y hora del evento: ${fecha} (zona horaria ${event.timezone}).`,
    event.type === 'digital'
      ? '¿Dónde es? Es un evento online/virtual. El enlace de acceso se envía por correo al confirmar la asistencia.'
      : `¿Dónde es? Lugar del evento: ${event.locationName ?? 'por confirmar'}${event.locationAddress ? ', ' + event.locationAddress : ''}.`,
    event.capacity ? `¿Cuántos cupos hay? Aforo: ${event.capacity} personas.` : '',
    event.requiresConfirmation
      ? '¿Cómo aseguro mi lugar? Debes confirmar tu asistencia tras registrarte.' : '',
    '¿Cómo me registro? Para asistir necesitas registrarte; recibirás un pase con código QR.',
    `¿Cuánto cuesta? ${event.requiresPayment ? 'Requiere pago según el tipo de entrada.' : 'El registro es gratuito.'}`,
  ].filter(Boolean);

  for (const f of facts) await indexChunk({ tenantId, eventId, sourceId: source.id, content: f });
  return facts.length;
}

export async function addFaq(
  tenantId: string, eventId: string, question: string, answer: string,
) {
  const source = await prisma.aiKnowledgeSource.create({
    data: {
      tenantId, eventId, type: 'faq',
      title: question.slice(0, 80), status: 'active', lastIndexedAt: new Date(),
    },
  });
  await indexChunk({
    tenantId, eventId, sourceId: source.id,
    content: `Pregunta: ${question}\nRespuesta: ${answer}`,
  });
  return source;
}

export async function listKnowledge(tenantId: string, eventId: string) {
  return prisma.aiKnowledgeSource.findMany({
    where: { tenantId, eventId },
    orderBy: { createdAt: 'asc' },
    include: { _count: { select: { chunks: true } } },
  });
}

// ───────── Recuperación semántica ─────────

interface RetrievedChunk { content: string; score: number; }

export async function retrieve(
  tenantId: string, eventId: string, query: string, k = 5,
): Promise<RetrievedChunk[]> {
  const vec = toVectorLiteral(embedLocal(query));
  const rows = await prisma.$queryRawUnsafe<{ content: string; score: number }[]>(
    `SELECT content, 1 - (embedding <=> $1::vector) AS score
     FROM "AiKnowledgeChunk"
     WHERE "tenantId" = $2::uuid AND "eventId" = $3::uuid AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $4::int`,
    vec, tenantId, eventId, k,
  );
  return rows.map((r) => ({ content: r.content, score: Number(r.score) }));
}

// ───────── Chat con RAG y guardarraíles ─────────

export interface ChatResult {
  conversationId: string;
  reply: string;
  grounded: boolean;
  mode: 'llm' | 'extractive' | 'fallback';
  sources: string[];
}

/**
 * Responde con RAG. Modos:
 * - 'llm': LLM configurado y match confiable → respuesta conversacional grounded
 * - 'extractive': sin LLM y match confiable → respuesta con los fragmentos directamente
 * - 'fallback': sin match confiable → mensaje honesto predefinido
 */
export async function chat(params: {
  tenantId: string;
  eventId: string;
  message: string;
  conversationId?: string;
}): Promise<ChatResult> {
  const [agentCfg, llmCfg, hits] = await Promise.all([
    getEffectiveAgentConfig(params.tenantId, params.eventId),
    getTenantLlmConfig(params.tenantId),
    retrieve(params.tenantId, params.eventId, params.message),
  ]);

  const relevantHits = hits.filter((h) => h.score >= MATCH_THRESHOLD);
  const grounded = relevantHits.length > 0;

  let reply: string;
  let mode: ChatResult['mode'];

  if (!grounded) {
    reply = agentCfg.fallbackMessage;
    mode = 'fallback';
  } else if (llmCfg) {
    // Modo conversacional con guardarraíl: el LLM solo ve el contexto recuperado.
    try {
      const context = relevantHits
        .slice(0, 4)
        .map((h, i) => `[${i + 1}] ${h.content}`)
        .join('\n');
      const systemPrompt = [
        `Eres el asistente oficial del evento "${(await prisma.event.findUnique({ where: { id: params.eventId }, select: { title: true } }))?.title ?? 'este evento'}".`,
        `Responde ÚNICAMENTE basándote en el siguiente contexto. Si no encuentras la respuesta en el contexto, dilo honestamente.`,
        `Responde en el mismo idioma que la pregunta. Sé conciso y amable.`,
        agentCfg.persona ? `Tono y personalidad: ${agentCfg.persona}` : '',
        '',
        `CONTEXTO:`,
        context,
        '',
        `INSTRUCCIÓN: No inventes información que no esté en el contexto.`,
      ].filter((l) => l !== null).join('\n');

      const client = buildLlmClient(llmCfg);
      const response = await client.chat.completions.create({
        model: llmCfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: params.message },
        ],
        max_tokens: llmCfg.maxTokens ?? 400,
        temperature: llmCfg.temperature ?? 0.3,
      });
      reply = response.choices[0]?.message?.content?.trim() ?? agentCfg.fallbackMessage;
      mode = 'llm';
    } catch (e) {
      // Si el LLM falla, cae a modo extractivo (no rompe la experiencia).
      console.error('[ai] LLM error, fallback extractivo:', e);
      reply = relevantHits.slice(0, 2)
        .map((h) => h.content.replace(/^Pregunta:.*\nRespuesta:\s*/s, ''))
        .join(' ');
      mode = 'extractive';
    }
  } else {
    // Modo extractivo (sin LLM).
    reply = relevantHits.slice(0, 2)
      .map((h) => h.content.replace(/^Pregunta:.*\nRespuesta:\s*/s, ''))
      .join(' ');
    mode = 'extractive';
  }

  // Persistencia.
  let conversationId = params.conversationId;
  if (!conversationId) {
    const conv = await prisma.aiConversation.create({
      data: { tenantId: params.tenantId, eventId: params.eventId, channel: 'web' },
    });
    conversationId = conv.id;
  }
  const tokIn = tokenize(params.message).length;
  const tokOut = tokenize(reply).length;
  await prisma.aiMessage.createMany({
    data: [
      { conversationId, role: 'user', content: params.message, tokensIn: tokIn },
      {
        conversationId, role: 'assistant', content: reply, tokensOut: tokOut,
        retrievedSources: relevantHits.map((h) => h.score) as Prisma.InputJsonValue,
      },
    ],
  });
  await prisma.aiConversation.update({
    where: { id: conversationId }, data: { lastMessageAt: new Date() },
  });
  const period = new Date().toISOString().slice(0, 7);
  await prisma.aiUsage.upsert({
    where: { tenantId_period: { tenantId: params.tenantId, period } },
    update: { messages: { increment: 1 }, tokensIn: { increment: tokIn }, tokensOut: { increment: tokOut } },
    create: { tenantId: params.tenantId, period, messages: 1, tokensIn: tokIn, tokensOut: tokOut },
  });

  return {
    conversationId,
    reply,
    grounded,
    mode,
    sources: relevantHits.map((h) => h.content.slice(0, 60)),
  };
}
