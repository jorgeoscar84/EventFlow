# EVENTFLOW — Contexto Completo para Inteligencia Artificial

> **Instrucciones para la IA que recibe este documento:**
> Este archivo contiene TODO lo que necesitas saber sobre el proyecto Eventflow para continuar
> su desarrollo de forma correcta y sin alucinaciones. Léelo completo antes de responder.
> El repo GitHub es: **https://github.com/jorgeoscar84/EventFlow**
>
> Cuando el usuario te pida hacer algo, primero busca si ya existe código o lógica relacionada
> (es un proyecto con +9 fases implementadas). No reinventes lo que ya está construido.

---

# PARTE 1 — QUÉ ES EVENTFLOW

Plataforma SaaS **multi-tenant** para crear, promocionar y gestionar eventos **presenciales y digitales**. El dueño de la plataforma (Jorge) actúa como Super Admin y da acceso a empresas/aliados que gestionan sus propios eventos de forma aislada.

## Funcionalidades implementadas (todas las fases 0-9 ✅)

| Módulo | Descripción | Estado |
|--------|-------------|--------|
| Auth + RBAC | Supabase Auth, roles/permisos por tenant | ✅ |
| Super Admin | Crea/gestiona empresas y planes | ✅ |
| Gestión de eventos | CRUD con slug único, presencial/digital/híbrido | ✅ |
| Landing pública | Premium (Fraunces+Inter, countdown, aurora, Framer Motion) | ✅ |
| Registro de asistentes | Campos personalizados, dedupe, aforo, lista de espera | ✅ |
| Confirmación anti-no-show | Token HMAC, reconfirmación, estado confirmed | ✅ |
| Pase con QR | QR firmado, página del pase, diseño tipo ticket | ✅ |
| Check-in por QR | PWA móvil, multi-asesor, ok/duplicado/inválido/no-confirmado | ✅ |
| Mensajería automatizada | Campañas (24h, 1h, reconfirm, thanks), scheduler DB-polling, SES | ✅ |
| Pagos | Stripe checkout + webhook idempotente + control manual pagó/no pagó | ✅ |
| Reportes / Export | Tabla filtrable, export CSV+Excel con campos personalizados | ✅ |
| Sorteos en vivo | Show con bombo animado, tambores Web Audio, confeti, re-sorteo | ✅ |
| SaaS / Branding | Límites de plan, branding por tenant, cabeceras de seguridad | ✅ |
| Asistente IA | RAG pgvector, modo extractivo/LLM, anti-alucinación, widget chat | ✅ |
| LLM configurable | Cualquier proveedor OpenAI-compatible desde el panel admin | ✅ |
| Vercel Cron | Scheduler como cron job (sin Redis), deployable en Vercel | ✅ |

---

# PARTE 2 — STACK TECNOLÓGICO

| Capa | Tecnología | Notas críticas |
|------|-----------|----------------|
| Runtime | **Node.js 22 LTS** | |
| Lenguaje | **TypeScript 5 strict** | Sin `any`. `noUncheckedIndexedAccess: true` |
| Framework | **Next.js 15** App Router + React 19 | Server Actions + API Routes |
| Estilos | **Tailwind CSS v4** | Variables CSS custom `--color-ink-*`, `--color-brand-*` |
| Animaciones | **Framer Motion** + canvas-confetti + Web Audio API | |
| Tipografía | **Fraunces** (display, `.font-display`) + **Inter** (UI) | Google Fonts vía `next/font` |
| ORM | **Prisma 6** | |
| Base de datos | **PostgreSQL vía Supabase** + **pgvector** | us-west-2, pooler IPv4 |
| Auth | **Supabase Auth** + `@supabase/ssr` | Sesión en cookies |
| Email | **Amazon SES** (SMTP) + Nodemailer | best-effort |
| Pagos | **Stripe** | Webhook en `/api/v1/webhooks/stripe` |
| LLM | **openai** SDK + `baseURL` custom | OpenRouter, Groq, Azure, Ollama... |
| Monorepo | **pnpm workspaces** + **Turborepo** | |
| Despliegue | **Vercel** (web) + **Supabase** (DB) | |

---

# PARTE 3 — ESTRUCTURA DEL REPOSITORIO

```
EventFlow/
├── apps/
│   ├── web/                    ← AQUÍ VIVE TODO EL FRONTEND Y LA API
│   │   ├── src/app/
│   │   │   ├── o/[tenant]/[event]/          → landing pública del evento
│   │   │   │   └── registro/                → formulario de registro
│   │   │   ├── pase/[qrToken]/              → pase digital con QR
│   │   │   ├── confirmar/[token]/           → confirmación de asistencia
│   │   │   ├── login/                       → autenticación
│   │   │   ├── checkin/                     → PWA de escaneo QR
│   │   │   │   └── [eventId]/               → escáner + contador
│   │   │   ├── sorteo/[raffleId]/           → pantalla del show
│   │   │   ├── dashboard/                   → panel del organizador
│   │   │   │   ├── events/                  → lista, crear, detalle
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx         → funnel + campañas
│   │   │   │   │       ├── registros/       → tabla + export
│   │   │   │   │       ├── sorteos/         → config sorteo
│   │   │   │   │       └── asistente/       → config IA
│   │   │   │   └── settings/                → branding + plan + LLM
│   │   │   ├── superadmin/                  → panel super admin
│   │   │   │   └── tenants/                 → lista + crear empresa
│   │   │   └── api/
│   │   │       ├── v1/                      → REST API autenticada
│   │   │       ├── v1/public/               → API pública (sin auth)
│   │   │       ├── v1/webhooks/             → Stripe + SES
│   │   │       └── cron/scheduler/          → Vercel Cron Job
│   │   ├── src/components/
│   │   │   ├── ui/                          → Button, Input, Card, Badge
│   │   │   ├── visual/                      → Countdown, Reveal, Stagger
│   │   │   ├── app-shell.tsx                → Sidebar + layout admin
│   │   │   └── assistant-widget.tsx         → Chat IA flotante
│   │   ├── src/lib/
│   │   │   ├── auth.ts          → getCurrentUser, requireUser, requirePermission
│   │   │   ├── api.ts           → ok(), fail(), handle()
│   │   │   ├── supabase/        → server.ts, admin.ts
│   │   │   ├── stripe.ts        → cliente Stripe
│   │   │   ├── email.ts         → sendConfirmationEmail (server-only)
│   │   │   ├── email-send.ts    → sendEmail (para cron, sin server-only)
│   │   │   ├── tokens.ts        → signToken, verifyToken (HMAC)
│   │   │   └── format.ts        → formatEventDate, formatEventTime
│   │   └── vercel.json          → cron cada 5min + comandos build
│   │
│   └── worker/
│       └── src/index.ts         → scheduler local (para desarrollo, no Vercel)
│
├── packages/
│   ├── db/                      ← LÓGICA DE DOMINIO Y BASE DE DATOS
│   │   ├── prisma/
│   │   │   ├── schema.prisma    → ~35 tablas + pgvector
│   │   │   ├── migrations/      → aplicadas en Supabase
│   │   │   ├── rls.sql          → políticas RLS
│   │   │   └── seed.ts          → permisos + plan Starter
│   │   └── src/services/
│   │       ├── auth.ts          → getUserAccessByEmail
│   │       ├── tenant.ts        → provisionTenant, listTenants, setTenantStatus
│   │       ├── event.ts         → createEvent, listEvents, publishEvent, getEventStats
│   │       ├── registration.ts  → registerForEvent, confirmRegistration
│   │       ├── checkin.ts       → scanCheckin, getCheckinStats, listScannableEvents
│   │       ├── messaging.ts     → campañas, materializeCampaign, processDueJobs
│   │       ├── payment.ts       → markManualPayment, recordStripePayment
│   │       ├── report.ts        → listRegistrations, buildExport, toCsv
│   │       ├── raffle.ts        → createRaffle, drawRound, rejectLastWinner
│   │       ├── public.ts        → getPublicEvent, listPublicEvents
│   │       ├── plan.ts          → assertCanCreateEvent, branding, getPlanUsage
│   │       └── ai.ts            → chat (RAG+LLM), ingestEventKnowledge, retrieve, saveTenantLlmConfig
│   │
│   ├── core/                    ← LÓGICA PURA (sin Prisma ni Next)
│   │   └── src/
│   │       ├── validation.ts    → registrationInputSchema, createEventSchema, aiChatInputSchema (Zod)
│   │       ├── registration-status.ts → canTransition, attendanceRate
│   │       ├── raffle.ts        → pickWinner (determinista con semilla)
│   │       ├── rbac.ts          → PERMISSIONS, SYSTEM_ROLES, hasPermission
│   │       └── tenant.ts        → resolveTenantFromHost, isValidSlug
│   │
│   ├── ui/                      ← DESIGN TOKENS
│   │   └── src/
│   │       ├── cn.ts            → cn() — merge de clases Tailwind
│   │       └── tokens.ts        → statusColor (por estado del funnel)
│   │
│   └── config/
│       └── tsconfig.base.json   → TypeScript config base
│
├── PRD/                         → 13 documentos de especificación
├── CONTEXT.md                   → Mapa del proyecto
├── AGENTS.md                    → Protocolo de trabajo para IAs
├── DECISIONS.md                 → ADRs técnicos
├── PROGRESS.md                  → Estado por fase
├── DEPLOY.md                    → Guía de despliegue en Vercel
└── .env.example                 → Todas las variables documentadas
```

---

# PARTE 4 — ARQUITECTURA EN CAPAS (OBLIGATORIO RESPETAR)

```
┌─────────────────────────────────────┐
│  apps/web/src/app/                  │ páginas, rutas, server actions
│  apps/web/src/lib/                  │ auth, api, supabase, stripe, email
└────────────────┬────────────────────┘
                 │ importa de
┌────────────────▼────────────────────┐
│  packages/db/src/services/          │ TODA la lógica de dominio
│  packages/db/src/index.ts           │ punto de entrada único
└────────────────┬────────────────────┘
                 │ usa
┌────────────────▼────────────────────┐
│  packages/db/prisma/                │ Prisma ORM → Supabase PostgreSQL
└─────────────────────────────────────┘
                 +
┌─────────────────────────────────────┐
│  packages/core/src/                 │ lógica pura (sin dependencias ext)
└─────────────────────────────────────┘
```

**Reglas de importación:**
- Las páginas importan de `lib/` y de `@eventflow/db`
- Los servicios importan de Prisma y de `@eventflow/core`
- Nunca metas lógica de negocio en páginas/componentes
- Nunca importes Next.js desde `packages/db` o `packages/core`

---

# PARTE 5 — MULTI-TENANCY (REGLA DE ORO)

**SIEMPRE filtrar por `tenantId`. Sin excepción.**

```typescript
// ✅ CORRECTO — siempre con tenantId
await prisma.event.findFirst({
  where: { id, tenantId: user.tenantId }
});

// ❌ ERROR DE SEGURIDAD — query sin tenantId
await prisma.event.findFirst({ where: { id } });
```

Cómo funciona la resolución de tenant:
1. Middleware lee el host → inyecta `x-tenant-slug` en headers
2. Las páginas públicas usan ruta: `/o/{tenant}/{evento}`
3. Los usuarios autenticados tienen `user.tenantId` en sesión
4. Super Admin (`user.isSuperAdmin = true`) puede operar sin tenant

---

# PARTE 6 — PATRONES DE CÓDIGO

## API Route Handler

```typescript
// apps/web/src/app/api/v1/eventos/route.ts
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requirePermission('event:create');
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');
    const data = mySchema.parse(await req.json());      // Zod valida
    const result = await myService(user.tenantId, data); // servicio en packages/db
    return ok(result, { status: 201 });
  });
}
// Respuestas: ok(data) → {data:...} | fail(status, code, msg) → {error:{code,message}}
// Códigos: 401 UNAUTHENTICATED, 403 FORBIDDEN, 402 PLAN_LIMIT, 404 NOT_FOUND,
//          409 CONFLICT, 422 VALIDATION_ERROR
```

## Server Action

```typescript
'use server';
export async function myAction(_prev: State, formData: FormData): Promise<State> {
  const user = await getCurrentUser();
  if (!user?.tenantId) return { error: 'No autorizado.' };
  // lógica aquí
  revalidatePath('/dashboard/events');
  redirect('/dashboard/events');
}
```

## Servicio en packages/db

```typescript
export async function doSomething(tenantId: string, input: Input) {
  const resource = await prisma.resource.findFirst({
    where: { id: input.id, tenantId }  // ← SIEMPRE tenantId
  });
  if (!resource) return null;
  // ...
}
// ⚠️ Exportar en packages/db/src/index.ts
```

---

# PARTE 7 — DESIGN SYSTEM

## Componentes disponibles (no reinventar)

```typescript
import { cn } from '@eventflow/ui';
import { Button } from '@/components/ui/button';          // variant: primary|secondary|ghost|danger
import { Input, Label, Select } from '@/components/ui/input';
import { Card, Badge } from '@/components/ui/card';       // Badge kind: draft|published|attended|...
import { PageHeader } from '@/components/app-shell';      // title + description + action
import { Reveal, Stagger, StaggerItem } from '@/components/visual/reveal';
import { Countdown } from '@/components/visual/countdown';
import { AssistantWidget } from '@/components/assistant-widget';
```

## Paleta de colores (SIEMPRE estas clases, no valores hardcoded)

```
Fondos oscuros:  bg-ink-950 / bg-ink-900 / bg-ink-800
Marca (índigo):  brand-300 / brand-400 / brand-500 / brand-600
Acento fuchsia:  accent-400 / accent-500
Texto apagado:   text-white/60 / text-white/40 / text-white/30
Bordes:          border-white/10 / border-white/15
Hover sutil:     hover:bg-white/10 / hover:border-white/20
```

## Tipografía

```html
<!-- Titulares: serif display (Fraunces) -->
<h1 class="font-display text-5xl tracking-tight">Título</h1>

<!-- Eyebrow / etiqueta uppercase con tracking amplio -->
<span class="eyebrow">ETIQUETA</span>

<!-- Cuerpo: Inter (por defecto vía font-sans) -->
<p class="text-sm text-white/60">Texto</p>
```

## Animaciones con propósito

```tsx
// Reveal al entrar en viewport
<Reveal delay={0.1}>contenido</Reveal>

// Aparición en cascada para listas/grids
<Stagger className="grid grid-cols-3 gap-4">
  <StaggerItem>ítem</StaggerItem>
  <StaggerItem>ítem</StaggerItem>
</Stagger>

// Siempre: motion con propósito, no decorativo
```

---

# PARTE 8 — BASE DE DATOS

## Conexión

```
# App (transacción, puerto 6543):
DATABASE_URL="postgresql://postgres.REF:PASS@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migraciones (sesión, puerto 5432):
DIRECT_URL="postgresql://postgres.REF:PASS@aws-1-us-west-2.pooler.supabase.com:5432/postgres"
```

El host directo `db.*.supabase.co` es solo IPv6 — usar siempre el pooler.

## Tablas principales

```
Plan              → planes SaaS con límites
Tenant            → empresas/aliados (slug único, branding JSONB)
User              → usuarios con isSuperAdmin + tenantId nullable
Role/Permission   → RBAC por tenant
Event             → eventos (tipo: in_person|digital|hybrid, status: draft|published|finished)
Registration      → registros (funnel: registered→confirmed→attended|no_show)
RegistrationFieldValue → valores de campos personalizados
AttendanceLog     → registro de escaneos de QR
Payment           → pagos (manual y Stripe)
MessageCampaign   → campañas de mensajería
MessageJob        → envíos individuales encolados
Raffle            → sorteos con semilla auditable
AiKnowledgeChunk  → fragmentos de conocimiento con embedding vector(1536)
AiConversation    → historial de chats del asistente
Integration       → config de integraciones externas (LLM, Stripe, Twilio)
```

## Funnel de estados de Registration

```
registered → confirmed → attended
    ↓              ↓
 waitlist        no_show
 cancelled
```

## Añadir campos nuevos

```bash
# 1. Modificar schema.prisma
# 2. Generar SQL de la diferencia:
cd packages/db
prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script \
  > prisma/migrations/YYYYMMDDHHMMSS_descripcion/migration.sql
# 3. Aplicar:
prisma migrate deploy
# 4. Regenerar cliente:
prisma generate
```

---

# PARTE 9 — ASISTENTE IA

## Cómo funciona

```
Pregunta del usuario
  ↓ embedLocal(texto) → vector 1536 dims (bag-of-words hash, determinista)
  ↓ retrieve() → búsqueda coseno en AiKnowledgeChunk (pgvector)
  ↓ hits con score ≥ 0.18?
      SÍ + LLM configurado → prompt grounded + llamada al LLM (OpenAI-compatible)
      SÍ sin LLM           → respuesta extractiva con los fragmentos
      NO                   → fallback honesto predefinido
```

## Configurar el LLM (panel admin)

**Ruta:** `/dashboard/settings` → sección "Inteligencia Artificial"

Proveedores compatibles (cualquier API OpenAI-compatible):
- **OpenRouter**: `https://openrouter.ai/api/v1` (acceso a todos los modelos)
- **OpenAI**: `https://api.openai.com/v1`
- **Groq**: `https://api.groq.com/openai/v1`
- **Azure OpenAI**: `https://RESOURCE.openai.azure.com/openai/deployments/DEPLOYMENT`
- **Ollama local**: `http://localhost:11434/v1`

La config se guarda en la tabla `Integration` (tipo `llm_openai_compatible`).  
Sin LLM configurado → funciona en modo extractivo (offline, sin API key).

## Fuentes de conocimiento

- `auto_event` → se genera automáticamente al activar el asistente (datos del evento)
- `faq` → preguntas/respuestas añadidas manualmente desde `/dashboard/events/{id}/asistente`
- Aislamiento garantizado: un tenant nunca puede ver chunks de otro

---

# PARTE 10 — DESPLIEGUE EN VERCEL

## Configuración del proyecto

| Ajuste Vercel | Valor |
|---------------|-------|
| Root Directory | `apps/web` |
| Framework Preset | Next.js (auto-detectado) |
| Install/Build | Definidos en `apps/web/vercel.json` |

## Variables de entorno obligatorias

```bash
APP_BASE_URL=https://tu-proyecto.vercel.app
DATABASE_URL=postgresql://postgres.REF:PASS@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.REF:PASS@aws-1-us-west-2.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://REF.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
AUTH_SECRET=string-aleatorio-largo-min-32-chars
CRON_SECRET=string-aleatorio-para-proteger-el-cron
```

## Vercel Cron Job

- **Ruta:** `/api/cron/scheduler`
- **Schedule:** `*/5 * * * *` (cada 5 min, configurable en `apps/web/vercel.json`)
- **Función:** materializa campañas de mensajería y envía emails vencidos por SES
- Vercel inyecta `Authorization: Bearer {CRON_SECRET}` automáticamente

---

# PARTE 11 — VARIABLES DE ENTORNO COMPLETAS

```bash
# App
APP_BASE_URL=http://localhost:3000
NODE_ENV=development
ROOT_DOMAIN=eventflow.app

# Base de datos Supabase
DATABASE_URL=postgresql://postgres.REF:PASS@aws-1-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.REF:PASS@aws-1-us-west-2.pooler.supabase.com:5432/postgres
SUPABASE_URL=https://REF.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Auth
AUTH_SECRET=string-aleatorio-largo

# Cron (Vercel)
CRON_SECRET=string-aleatorio

# Email (Amazon SES SMTP)
SES_SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SES_SMTP_PORT=587
SES_SMTP_USER=
SES_SMTP_PASS=
SES_REGION=us-east-1
MAIL_FROM_DEFAULT="Eventflow <no-reply@tu-dominio.com>"

# Pagos (Stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# LLM (fallback de plataforma — también configurable por tenant desde el panel)
LLM_PLATFORM_BASE_URL=https://openrouter.ai/api/v1
LLM_PLATFORM_API_KEY=
LLM_PLATFORM_MODEL=openai/gpt-4o-mini
```

---

# PARTE 12 — REGLAS PARA LA IA (ANTI-ALUCINACIÓN)

1. **No inventes funciones o campos.** Siempre busca el código real antes de usarlo.
2. **El schema.prisma es la fuente de verdad** para el modelo de datos.
3. **Todos los servicios se exportan desde `packages/db/src/index.ts`** — verifica que existan.
4. **SIEMPRE filtra por `tenantId`** en cualquier query a tablas de negocio.
5. **No rompas contratos de API existentes** sin actualizar todos los consumidores.
6. **Antes de añadir un campo DB**, crea una migración incremental (no modifiques migraciones existentes).
7. **Verifica antes de marcar como hecho:**
   ```bash
   pnpm -r --filter './packages/*' typecheck
   pnpm --filter @eventflow/web build
   pnpm --filter @eventflow/core test
   ```

---

# PARTE 13 — PENDIENTE / BACKLOG

Funcionalidad que falta por implementar (puedes trabajar en esto):

| Ítem | Prioridad | Módulo |
|------|-----------|--------|
| Invitar miembros del equipo con roles desde la UI | Media | M12 |
| Constructor visual de landing drag-and-drop | Media | M4 avanzado |
| Dashboard de check-in en tiempo real (Supabase Realtime) | Baja | M8 |
| Dominios personalizados por tenant | Baja | M2/despliegue |
| Webhooks de estado de entrega de SES (bounce/open/click) | Media | M7 |
| WhatsApp/Twilio (estructura ya en `integrations`) | Baja | M7 |
| A/B testing de landing | Baja | M4 |
| i18n completo (base con `EventTranslation` ya existe) | Baja | global |

---

# PARTE 14 — SUPER ADMIN Y DEMO

- **Super Admin:** `admin@eventflow.app` / contraseña temporal `33KbIgGD3hDu` *(rotar en producción)*
- **Evento demo:** `/o/demo/future-summit-2026` (en Supabase, ya publicado)
- **Scripts de verificación:** `packages/db/scripts/verify-*.ts`
- **Script bootstrap super admin:** `packages/db/scripts/bootstrap-superadmin.ts`

---

# PARTE 15 — COMANDOS ÚTILES

```bash
# Desarrollo local
pnpm install
pnpm --filter @eventflow/web dev          # app en :3000
pnpm --filter @eventflow/worker dev       # scheduler de mensajería

# Base de datos
pnpm --filter @eventflow/db run migrate:deploy   # aplicar migraciones
pnpm --filter @eventflow/db exec prisma generate # regenerar cliente
pnpm --filter @eventflow/db exec prisma studio   # UI de BD

# Bootstrap / demo
cd packages/db && SUPERADMIN_EMAIL=tu@email.com tsx scripts/bootstrap-superadmin.ts
cd packages/db && tsx scripts/seed-demo-event.ts

# Verificación
pnpm -r --filter './packages/*' typecheck
pnpm --filter @eventflow/web build
pnpm --filter @eventflow/core test

# Verificación específica por módulo
cd packages/db && tsx scripts/verify-checkin.ts
cd packages/db && tsx scripts/verify-messaging.ts
cd packages/db && tsx scripts/verify-raffle.ts
cd packages/db && tsx scripts/verify-ai.ts
```
