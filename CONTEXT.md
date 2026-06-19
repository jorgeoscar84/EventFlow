# Eventflow — Contexto completo del proyecto

> **Para IAs y desarrolladores que llegan nuevos al repositorio.**
> Este archivo es tu mapa. Léelo antes de tocar código.
> Última actualización: junio 2026 · Estado: todas las fases implementadas y verificadas.

---

## ¿Qué es este proyecto?

**Eventflow** es una plataforma SaaS multi-tenant para crear, promocionar y gestionar eventos **presenciales y digitales**. Incluye:

- Landing pública de alta conversión por evento
- Registro de asistentes con confirmación anti-no-show
- Check-in por código QR (PWA para móvil)
- Mensajería automatizada (Amazon SES: confirmación, recordatorios, reconfirmación)
- Control de pagos (Stripe + manual)
- Reportes exportables a Excel/CSV
- Sorteos en vivo tipo "show" (bombo animado, tambores, confeti)
- Asistente IA conversacional por evento (RAG sobre pgvector)
- Multi-tenant: tú como Super Admin das acceso a empresas/aliados que gestionan sus propios eventos

**Repo GitHub:** https://github.com/jorgeoscar84/EventFlow  
**Demo funcionando:** `/o/demo/future-summit-2026`  
**Panel admin:** `/dashboard` (login: `admin@eventflow.app`)

---

## Stack tecnológico

| Capa | Tecnología | Notas |
|------|-----------|-------|
| Runtime | Node.js 22 LTS | |
| Lenguaje | TypeScript 5 (strict) | Sin `any` |
| Framework | Next.js 15 (App Router) + React 19 | SSR + Server Actions |
| Estilos | Tailwind CSS v4 + diseño custom | Fraunces serif + Inter |
| Animaciones | Framer Motion + canvas-confetti + Web Audio | |
| ORM | Prisma 6 | |
| Base de datos | PostgreSQL (Supabase) + pgvector | us-west-2, pooler IPv4 |
| Auth | Supabase Auth + @supabase/ssr | |
| Email | Amazon SES (SMTP) + Nodemailer | Best-effort, configurable |
| Pagos | Stripe | Webhook idempotente |
| LLM | OpenAI-compatible (OpenRouter, etc.) | Configurable desde admin |
| Monorepo | pnpm workspaces + Turborepo | |
| Despliegue | Vercel + Supabase cloud | |

---

## Estructura del monorepo

```
EventFlow/
├── apps/
│   ├── web/                    # Next.js — TODO vive aquí
│   │   ├── src/app/
│   │   │   ├── (public)/       # Rutas públicas (sin auth)
│   │   │   │   ├── o/[tenant]/[event]/         → landing del evento
│   │   │   │   ├── o/[tenant]/[event]/registro → formulario
│   │   │   │   ├── pase/[qrToken]              → pase con QR
│   │   │   │   └── confirmar/[token]           → confirmación de asistencia
│   │   │   ├── login/          → página de login
│   │   │   ├── dashboard/      → panel del organizador (auth requerida)
│   │   │   │   ├── events/     → lista + crear + detalle + registros + sorteos + asistente
│   │   │   │   └── settings/   → branding + plan + LLM
│   │   │   ├── superadmin/     → panel del super admin (solo isSuperAdmin)
│   │   │   │   └── tenants/    → lista + nueva empresa
│   │   │   ├── checkin/        → PWA de escaneo de QR
│   │   │   │   └── [eventId]   → escáner + contador
│   │   │   ├── sorteo/[raffleId] → pantalla del show en vivo
│   │   │   └── api/
│   │   │       ├── v1/         → REST API (auth requerida)
│   │   │       ├── v1/public/  → API pública (sin auth)
│   │   │       ├── v1/webhooks → Stripe + SES
│   │   │       └── cron/scheduler → Vercel Cron Job (mensajería)
│   │   ├── src/components/
│   │   │   ├── ui/             → Button, Input, Card, Badge
│   │   │   ├── visual/         → Countdown, Reveal, Stagger (animaciones)
│   │   │   ├── app-shell.tsx   → Sidebar + layout admin
│   │   │   └── assistant-widget.tsx → Chat IA flotante
│   │   ├── src/lib/
│   │   │   ├── auth.ts         → getCurrentUser, requireUser, requirePermission
│   │   │   ├── api.ts          → ok(), fail(), handle() — respuestas consistentes
│   │   │   ├── supabase/       → server.ts, admin.ts
│   │   │   ├── stripe.ts       → cliente Stripe
│   │   │   ├── email.ts        → sendConfirmationEmail (server-only)
│   │   │   ├── email-send.ts   → sendEmail (para cron)
│   │   │   ├── tokens.ts       → signToken, verifyToken (HMAC)
│   │   │   └── format.ts       → formatEventDate, formatEventTime
│   │   └── vercel.json         → cron jobs + comandos de build
│   │
│   └── worker/                 # Proceso de desarrollo local (no Vercel)
│       └── src/index.ts        → Scheduler DB-polling (para desarrollo local)
│
├── packages/
│   ├── db/                     # Todo lo de base de datos
│   │   ├── prisma/
│   │   │   ├── schema.prisma   → ~35 tablas + pgvector
│   │   │   ├── migrations/     → migraciones aplicadas
│   │   │   ├── rls.sql         → políticas RLS
│   │   │   └── seed.ts         → permisos + plan Starter
│   │   └── src/
│   │       ├── index.ts        → exports centralizados
│   │       └── services/
│   │           ├── auth.ts     → getUserAccessByEmail
│   │           ├── tenant.ts   → provisionTenant, listTenants, setTenantStatus
│   │           ├── event.ts    → createEvent, listEvents, publishEvent, getEventStats
│   │           ├── registration.ts → registerForEvent, confirmRegistration
│   │           ├── checkin.ts  → scanCheckin, getCheckinStats
│   │           ├── messaging.ts → campañas, materializeCampaign, processDueJobs
│   │           ├── payment.ts  → markManualPayment, recordStripePayment
│   │           ├── report.ts   → listRegistrations, buildExport, toCsv
│   │           ├── raffle.ts   → createRaffle, drawRound, rejectLastWinner
│   │           ├── public.ts   → getPublicEvent, listPublicEvents
│   │           ├── plan.ts     → assertCanCreateEvent, branding, getPlanUsage
│   │           └── ai.ts       → chat (RAG+LLM), ingestEventKnowledge, retrieve
│   │
│   ├── core/                   # Lógica de dominio pura (sin frameworks)
│   │   └── src/
│   │       ├── validation.ts   → Schemas Zod (registrationInputSchema, createEventSchema, aiChatInputSchema)
│   │       ├── registration-status.ts → FSM de estados (canTransition, attendanceRate)
│   │       ├── raffle.ts       → pickWinner (determinista con semilla)
│   │       ├── rbac.ts         → PERMISSIONS, SYSTEM_ROLES, hasPermission
│   │       └── tenant.ts       → resolveTenantFromHost, isValidSlug
│   │
│   ├── ui/                     # Design tokens + utilidades CSS
│   │   └── src/
│   │       ├── cn.ts           → cn() — merge de clases Tailwind
│   │       └── tokens.ts       → statusColor, radius, font
│   │
│   └── config/
│       └── tsconfig.base.json  → TypeScript config base (strict)
│
├── PRD/                        # Especificación del producto (13 documentos)
│   ├── 00-INDICE.md            → Índice maestro
│   ├── 04-MODELO-DE-DATOS.md  → Esquema completo (leer antes de tocar DB)
│   ├── 05-MODULOS-FUNCIONALES.md → Especificación + criterios de aceptación
│   ├── 10-GUIA-EJECUCION-IA.md → Protocolo para agentes de IA
│   ├── 11-ROADMAP.md           → Fases y estado
│   └── 13-CAMBIOS-IMPLEMENTACION.md → Mejoras vs. PRD original
│
├── CONTEXT.md                  → Este archivo
├── AGENTS.md                   → Protocolo para IAs/agentes
├── DECISIONS.md                → ADRs (decisiones técnicas)
├── PROGRESS.md                 → Estado por fase
├── QUESTIONS.md                → Preguntas abiertas y supuestos
├── DEPLOY.md                   → Guía de despliegue en Vercel
└── .env.example                → Todas las variables de entorno documentadas
```

---

## Estado actual: TODAS las fases completadas ✅

| Fase | Módulos | Estado |
|------|---------|--------|
| 0 | Fundaciones (monorepo, DB, RLS, seeds) | ✅ |
| 1 | Auth + Super Admin + Eventos (M1/M2/M3) | ✅ |
| 2 | Público + Registro + Confirmación (M4/M5/M6/M7/M13) | ✅ |
| 3 | Check-in QR — PWA (M8) | ✅ |
| 4 | Mensajería automatizada (M7 completo) | ✅ |
| 5 | Pagos (M11) | ✅ |
| 6 | Reportes y export CSV/Excel (M10) | ✅ |
| 7 | Sorteos en vivo — show (M9) | ✅ |
| 8 | SaaS: límites de plan, branding, hardening | ✅ |
| 9 | Asistente IA — RAG + pgvector + LLM (M14) | ✅ |

Cada fase tiene scripts de verificación en `packages/db/scripts/verify-*.ts`.

---

## Flujo de datos principal

```
Usuario → /o/{tenant}/{evento} (landing pública, SSR)
  → registro → QR token → email SES (best-effort)
  → confirmar/{token} → status confirmed
  → día del evento: /checkin/{eventId} → scan QR → status attended
  → sorteo: /sorteo/{raffleId} → show en vivo
  → reporte: /dashboard/events/{id}/registros → export Excel
```

---

## Convenciones de código

### Arquitectura en capas
```
pages/routes (Next.js)
  ↓ usa
lib/auth.ts (getCurrentUser, requirePermission)
lib/api.ts (ok, fail, handle)
  ↓ llama a
packages/db/services/*.ts (lógica de dominio)
  ↓ usa
packages/db/prisma (Prisma ORM)
  ↓ accede a
Supabase PostgreSQL
```

### Patrones obligatorios

**API routes:**
```typescript
export async function GET(req: Request, { params }: ...) {
  return handle(async () => {
    const user = await requirePermission('event:create');
    if (!user.tenantId) return fail(403, 'NO_TENANT', '...');
    // lógica aquí
    return ok(result);
  });
}
```

**Server Actions:**
```typescript
'use server';
export async function myAction(_prev: State, formData: FormData): Promise<State> {
  const user = await getCurrentUser();
  if (!user?.tenantId) return { error: 'No autorizado.' };
  // ...
}
```

**SIEMPRE filtrar por tenantId:**
```typescript
// ✅ Correcto
await prisma.event.findFirst({ where: { id, tenantId: user.tenantId } });
// ❌ Incorrecto — fuga de datos entre tenants
await prisma.event.findFirst({ where: { id } });
```

### Respuestas API
```json
// Éxito:  { "data": {...} }
// Error:  { "error": { "code": "STRING_CODE", "message": "..." } }
// Códigos: 401 sin auth, 403 sin permiso, 402 límite plan, 422 validación, 409 conflicto
```

---

## Base de datos — notas clave

- **Supabase** región us-west-2, pooler IPv4 (`aws-1-us-west-2.pooler.supabase.com`)
- **Puerto 6543** (transacción) para la app, **5432** (sesión) para migraciones
- **Todas las tablas de negocio** tienen `tenantId` como first-class citizen
- **pgvector** habilitado — columna `embedding vector(1536)` en `AiKnowledgeChunk`
- **RLS** habilitado como red de seguridad; la app filtra por `tenantId` en la capa de servicio

### Migraciones aplicadas
```
20260619000000_init          → todas las tablas iniciales
20260619100000_tenant_branding → columna branding en Tenant
```

### Estados del funnel de asistentes
```
registered → confirmed → attended
         ↓           ↓
      waitlist    no_show
      cancelled
```

---

## Multi-tenancy — cómo funciona

1. **Super Admin** (tú) en `/superadmin/tenants` → crea empresas/aliados
2. Cada empresa tiene su **Org Admin** con acceso a `/dashboard`
3. El tenant se resuelve por **ruta URL**: `/o/{tenant}/{evento}`
4. En producción se puede configurar por subdominio (middleware listo)
5. **Aislamiento**: `tenantId` en cada query + RLS como backup

---

## LLM / Asistente IA — cómo funciona

```
mensaje del usuario
  ↓ embedLocal() → vector 1536 dims
  ↓ retrieve() → busca en AiKnowledgeChunk por coseno (pgvector)
  ↓ si score ≥ 0.18:
      → con LLM configurado: prompt grounded + LLM call
      → sin LLM: respuesta extractiva (texto de los chunks)
  ↓ si score < 0.18:
      → fallback honesto predefinido
```

**Configurar LLM:** `/dashboard/settings` → sección "Inteligencia Artificial"
- Compatible con: OpenRouter, OpenAI, Groq, Azure OpenAI, Ollama
- Se guarda en `integrations` (tipo `llm_openai_compatible`)
- Sin clave → funciona en modo extractivo

---

## Cómo arrancar el desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Copiar .env y configurar credenciales de Supabase
cp .env.example .env

# 3. Ejecutar migraciones (si es base nueva)
pnpm --filter @eventflow/db run migrate:deploy

# 4. Crear el Super Admin
cd packages/db
SUPERADMIN_EMAIL=tu@email.com tsx scripts/bootstrap-superadmin.ts

# 5. Cargar datos demo (opcional)
pnpm exec tsx scripts/seed-demo-event.ts

# 6. Arrancar la app
pnpm --filter @eventflow/web dev        # App en :3000
pnpm --filter @eventflow/worker dev     # Scheduler de mensajería (local)
```

---

## Pendiente (backlog)

Funcionalidad pendiente de implementar:
- [ ] Equipo: invitar miembros y asignar roles desde la UI (M12 UI)
- [ ] Constructor visual de landing con drag-and-drop (M4 avanzado)
- [ ] Dominios personalizados por tenant
- [ ] Dashboard de check-in en tiempo real (Supabase Realtime)
- [ ] WhatsApp/Twilio (estructura lista, pendiente credenciales)
- [ ] i18n completo (estructura lista con `EventTranslation`)

---

## Archivos que SIEMPRE debes leer antes de trabajar en un módulo

| Módulo | Archivo de referencia |
|--------|----------------------|
| Modelo de datos | `PRD/04-MODELO-DE-DATOS.md` |
| Especificación funcional | `PRD/05-MODULOS-FUNCIONALES.md` |
| API contratos | `PRD/06-API-CONTRATOS.md` |
| Cambios vs. PRD | `PRD/13-CAMBIOS-IMPLEMENTACION.md` |
| Decisiones técnicas | `DECISIONS.md` |
| Estado actual | `PROGRESS.md` |
