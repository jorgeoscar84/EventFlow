import { aiChatInputSchema } from '@eventflow/core';
import { getPublicEvent, getEffectiveAgentConfig, chat } from '@eventflow/db';
import { ok, fail, handle } from '@/lib/api';

/** Chat público del asistente del evento (PRD M14). Sin auth. */
export async function POST(req: Request) {
  return handle(async () => {
    const input = aiChatInputSchema.parse(await req.json());
    if (!input.eventSlug) return fail(400, 'EVENT_REQUIRED', 'Falta el evento');

    const data = await getPublicEvent(input.tenantSlug, input.eventSlug);
    if (!data) return fail(404, 'NOT_FOUND', 'Evento no encontrado');

    const cfg = await getEffectiveAgentConfig(data.event.tenantId, data.event.id);
    if (!cfg.enabled) return fail(403, 'AI_DISABLED', 'El asistente no está activo');

    const res = await chat({
      tenantId: data.event.tenantId,
      eventId: data.event.id,
      message: input.message,
      conversationId: input.conversationId,
    });
    return ok({ conversationId: res.conversationId, reply: res.reply, grounded: res.grounded });
  });
}
