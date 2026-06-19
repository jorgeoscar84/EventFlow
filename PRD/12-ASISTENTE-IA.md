# 12 — Asistente IA Conversacional (Configurable por Cuenta y por Evento)

> Módulo **M14**. Agente conversacional basado en LLM que responde a los **clientes finales** de cada evento con información **personalizada y verificada**, configurable a nivel de **tenant (cuenta)** y **sobrescribible por evento**. Diseñado con RAG (recuperación + generación) y guardarraíles estrictos **anti-alucinación**.

## 12.1 Objetivo
- Responder dudas de asistentes (horarios, ubicación, agenda, ponentes, precios, cómo registrarse, cómo confirmar, acceso al webinar, etc.) **24/7**.
- Aumentar conversión (resuelve objeciones en la landing) y asistencia (recuerda y guía).
- Reducir carga de soporte humano del organizador.
- Ser **configurable y "nutrible"** con información por cada cuenta y por cada evento, para respuestas a medida.

## 12.2 Principios (no negociables)
1. **Grounded / sin alucinar.** El agente responde **solo** con: (a) datos estructurados del evento (de la DB) y (b) la base de conocimiento aprobada (RAG). Si no encuentra respuesta confiable → lo dice y ofrece escalar a humano o dejar datos. Prohibido inventar precios, fechas o promesas.
2. **Aislado por tenant/evento.** El contexto del agente **nunca** mezcla conocimiento de otro tenant u otro evento. Refuerza el multi-tenant de `02`/`09`.
3. **Privacidad.** No expone PII de un registrante a terceros. Acciones sensibles (ver estado de un registro) requieren verificación de identidad (email + token/código).
4. **Proveedor-agnóstico.** Capa de abstracción de LLM: se puede cambiar de proveedor/modelo sin tocar el producto.
5. **Coste controlado.** Límites por plan, caché de respuestas frecuentes, embeddings reutilizables.

## 12.3 Arquitectura (RAG + tools)

```
Usuario (widget web / WhatsApp) 
   → API de chat (resuelve tenant + evento + sesión)
   → Orquestador del Agente
        1) Recupera config del agente (tenant + override de evento)
        2) Construye contexto:
             - Datos estructurados del evento (agenda, lugar, fechas, tickets) → "event facts"
             - RAG: embeddings (pgvector) de la base de conocimiento aprobada
        3) Llama al LLM (provider abstracto) con system prompt + contexto + historial
        4) Tool-calling con guardarraíles (registrar, ver estado, enviar QR, escalar)
        5) Post-validación: ¿la respuesta se apoya en el contexto? Si no → fallback
   → Respuesta + citas/fuentes internas
   → Log en ai_conversations / ai_messages (analítica y mejora)
```

- **Embeddings y búsqueda semántica con `pgvector`** dentro del mismo Postgres/Supabase (sin infra extra).
- **Ingesta de conocimiento ("nutrición"):** automática desde los datos del evento + manual (texto/FAQ, documentos PDF, URLs). Pipeline: extraer → trocear (chunks) → embeber → indexar.

## 12.4 Niveles de configuración (cuenta → evento)
La configuración tiene **herencia**: el evento hereda del tenant y puede **sobrescribir**.

**A nivel cuenta (tenant) — `ai_agent_configs` (scope=tenant):** valores por defecto para todos sus eventos.
**A nivel evento — `ai_agent_configs` (scope=event):** overrides específicos.

Campos configurables:
- `enabled` (on/off).
- `display_name` (ej. "Asistente de [Evento]").
- `persona` / `tone` (formal, cercano, entusiasta, técnico...).
- `language` / multi-idioma (auto-detección).
- `welcome_message` y sugerencias rápidas (chips de preguntas frecuentes).
- `system_instructions` (instrucciones de marca, qué puede y qué no puede prometer).
- `allowed_topics` / `restricted_topics` (ej. no dar consejo legal/médico).
- `fallback_behavior` (mensaje cuando no sabe) + `escalation` (capturar lead / abrir ticket / mostrar contacto).
- `lead_capture` (pedir nombre/email/teléfono en la conversación → crea/asocia `registration` o lead).
- `enabled_tools` (qué acciones puede ejecutar, ver 12.6).
- `model_settings` (proveedor, modelo, temperatura — con tope), heredables del default de plataforma.
- `knowledge_scope` (qué fuentes usa: solo del evento, evento + cuenta).

## 12.5 Base de conocimiento ("nutrición")
Fuentes ingeribles, por tenant y/o por evento:
1. **Auto (estructurada):** se genera/actualiza automáticamente desde el evento — título, descripción, fecha/hora + zona horaria, ubicación + cómo llegar, enlace digital (si aplica y según reglas), agenda, ponentes, tipos de ticket/precios, política de confirmación. **Siempre la fuente de verdad para datos críticos** (fechas, precios, lugar).
2. **Manual — FAQ:** pares pregunta/respuesta curados por el organizador.
3. **Documentos:** PDF/MD/TXT subidos (brochure, reglamento) → troceados y embebidos.
4. **URLs:** páginas indexadas (con control de refresco).

Cada fuente: `status` (active/archived), `last_indexed_at`, versión. **Datos críticos (fecha, lugar, precio) se leen en vivo de la DB**, no solo del texto, para evitar desfases.

## 12.6 Acciones / herramientas del agente (tool-calling con guardarraíles)
El agente puede ejecutar acciones acotadas (según `enabled_tools` y verificación):
- `get_event_info` — datos del evento (siempre permitido).
- `start_registration` — guía y registra al usuario (reutiliza M5; respeta validaciones y aforo).
- `get_registration_status` — **requiere verificar identidad** (email + código enviado) antes de revelar estado.
- `resend_qr` / `resend_confirmation` — reenvía pase/enlace tras verificación (reutiliza M7).
- `add_to_calendar` — entrega `.ics`.
- `escalate_to_human` — crea ticket/notifica al organizador y/o captura datos de contacto.

Toda acción valida permisos, tenant/evento y deja traza en logs. **El agente nunca modifica pagos ni datos sensibles directamente.**

## 12.7 Canales
- **Widget web** embebido en la landing del tenant y en cada página de evento (burbuja de chat, branding del tenant, sugerencias). Mobile-first.
- **Estructura reutilizando `07`** para responder por **WhatsApp/SMS/email** con el mismo motor (mismos providers de canal). Activable por plan/integración.

## 12.8 Guardarraíles anti-alucinación (detalle)
- **System prompt** fija: responder solo con el contexto provisto; si falta info, decirlo; no inventar; citar la fuente interna.
- **Recuperación obligatoria:** sin chunks relevantes por encima de un umbral de similitud → respuesta de fallback (no se "improvisa").
- **Datos críticos** (fecha/hora/lugar/precio/enlace) **solo** desde la consulta estructurada en vivo, nunca parafraseados libremente.
- **Post-check** opcional: validar que la respuesta no afirma datos fuera del contexto.
- **Filtros de seguridad/moderación** de entrada y salida; bloqueo de temas restringidos.
- **Rate limiting** y límite de tokens por sesión/plan.

## 12.9 Modelo de datos (añadir a `04`)

### `ai_agent_configs`
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| scope | enum(tenant, event) | herencia |
| event_id | uuid FK null | si scope=event |
| enabled | bool | |
| display_name | text | |
| persona | text | tono/estilo |
| language | text | o `auto` |
| welcome_message | text | |
| quick_replies | jsonb | chips sugeridos |
| system_instructions | text | reglas de marca |
| allowed_topics / restricted_topics | jsonb | |
| fallback_behavior | jsonb | mensaje + acción |
| lead_capture | jsonb | qué pide y cuándo |
| enabled_tools | jsonb | lista de tools activas |
| model_provider | enum(openai, anthropic, azure_openai, local, default) | |
| model_name | text | |
| model_settings | jsonb | temperature (con tope), max_tokens |
| knowledge_scope | enum(event_only, event_and_tenant) | |

### `ai_knowledge_sources`
`id, tenant_id, event_id null, type enum(auto_event, faq, document, url, text), title, status enum(active,archived), raw_ref (url/storage path), last_indexed_at, created_by`.

### `ai_knowledge_chunks`
`id, tenant_id, event_id null, source_id FK, content text, token_count int, embedding vector(N), metadata jsonb`. Índice **ivfflat/hnsw** sobre `embedding` (pgvector). Filtrado siempre por `tenant_id` (+ `event_id` según scope).

### `ai_conversations`
`id, tenant_id, event_id null, channel enum(web,whatsapp,sms,email), visitor_ref (anon id), registration_id null, status enum(open,escalated,closed), started_at, last_message_at, metadata jsonb (utm, lang)`.

### `ai_messages`
`id, conversation_id FK, role enum(user,assistant,system,tool), content text, tool_name null, tokens_in/tokens_out int, retrieved_sources jsonb, created_at`.

### `ai_usage` (control de coste por tenant/mes)
`tenant_id, period, tokens_in, tokens_out, messages, estimated_cost_cents`. Enforcement por límites del `plan` (`02`/`11`).

> Las credenciales de LLM por tenant (BYOK opcional) se guardan cifradas en `integrations` (`type=llm_openai`/`llm_anthropic`...), igual que SMTP/WhatsApp.

## 12.10 Abstracción de proveedor LLM (añadir a `03`)
```ts
interface LlmProvider {
  chat(input: {
    system: string; messages: ChatMsg[]; tools?: ToolDef[];
    settings: { model: string; temperature: number; maxTokens: number };
    tenantId: string;
  }): Promise<{ content: string; toolCalls?: ToolCall[]; usage: TokenUsage }>;
  embed(input: { texts: string[]; tenantId: string }): Promise<number[][]>;
}
// Implementaciones: OpenAiProvider, AnthropicProvider, AzureOpenAiProvider, (LocalProvider opcional)
```
- Selección por `model_provider` (config) con **fallback al default de plataforma**.
- **BYOK** (Bring Your Own Key): el tenant puede usar su propia API key (controla su coste) o el pool de la plataforma (medido por `ai_usage` para facturar).

## 12.11 Contratos de API (añadir a `06`)
```
# Configuración (panel)
GET/PUT  /api/v1/ai/config?scope=tenant
GET/PUT  /api/v1/events/:id/ai/config            # override por evento
# Conocimiento
GET/POST/DELETE /api/v1/ai/knowledge             # fuentes (tenant)
GET/POST/DELETE /api/v1/events/:id/ai/knowledge  # fuentes (evento)
POST     /api/v1/ai/knowledge/:sourceId/reindex  # re-embeber
# Chat público (cliente final)
POST     /api/v1/public/ai/chat
         body: { eventSlug?, tenantSlug, conversationId?, message, lang? }
         resp: { conversationId, reply, suggestions?, requiresVerification?, escalated? }
# Verificación de identidad para acciones sensibles
POST     /api/v1/public/ai/verify                # envía código al email
POST     /api/v1/public/ai/verify/confirm
# Analítica
GET      /api/v1/events/:id/ai/analytics         # nº conversaciones, deflexión, top preguntas
```
**Errores:** `429 AI_RATE_LIMITED`, `402 AI_QUOTA_EXCEEDED`, `403 VERIFICATION_REQUIRED`.

## 12.12 Analítica del asistente
- Nº de conversaciones, mensajes, idioma, canal.
- **Tasa de deflexión** (resueltas sin humano) y de **escalado**.
- **Top preguntas** y **vacíos de conocimiento** (preguntas sin respuesta confiable) → sugerencias para nutrir la base.
- Conversaciones que terminaron en registro (atribución de conversión).

## 12.13 UX (añadir a `08`)
- Burbuja de chat con branding del tenant; abre panel con mensaje de bienvenida + chips de preguntas frecuentes.
- Respuestas con formato (listas, enlaces, botón "Registrarme", "Añadir al calendario").
- Indicador de "escribiendo", historial de la sesión, opción "hablar con una persona".
- En el panel admin: editor de configuración (con vista previa de chat en vivo), gestor de base de conocimiento (subir docs, FAQ, URLs, reindexar) y panel de analítica/vacíos de conocimiento.

## 12.14 Roadmap (añadir a `11`)
- **Fase 9 — Asistente IA (M14):**
  1. Esquema + pgvector + pipeline de ingesta (auto del evento + FAQ).
  2. Abstracción LLM + RAG + guardarraíles + widget web.
  3. Configuración tenant/evento con herencia + vista previa.
  4. Tools (registro, estado con verificación, reenvío QR, escalado).
  5. Analítica + control de coste por plan + (opcional) canal WhatsApp.
  - **Gates:** Seguridad (aislamiento tenant/evento, PII, verificación), Anti-alucinación (no responde fuera de contexto; datos críticos en vivo), Coste (límites por plan), UX.

### Criterios de Aceptación (CA-M14)
- CA-M14.1: El agente responde **solo** con datos del evento + base de conocimiento aprobada; ante falta de info, lo admite y ofrece escalar/dejar datos (probado con preguntas trampa).
- CA-M14.2: La configuración por evento **sobrescribe** la de la cuenta (herencia verificada).
- CA-M14.3: El conocimiento de un evento/tenant **no se filtra** a otro (test de aislamiento del retriever).
- CA-M14.4: Datos críticos (fecha, lugar, precio, enlace) provienen de la consulta en vivo y coinciden con la DB.
- CA-M14.5: Acciones sensibles (ver estado de registro, reenviar QR) exigen verificación de identidad.
- CA-M14.6: Se puede cambiar de proveedor/modelo de LLM sin cambios en el producto (abstracción).
- CA-M14.7: El consumo se mide en `ai_usage` y respeta los límites del plan (cuota → `402`).
