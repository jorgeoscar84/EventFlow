# 03 — Stack Tecnológico y Decisión de Base de Datos

> Principio: **moderno pero estable y compatible**. Nada experimental en rutas críticas. Versiones LTS / estables. TypeScript estricto en todo el monorepo.

## 3.1 Resumen del stack

| Capa | Tecnología | Versión objetivo | Por qué |
|------|------------|------------------|---------|
| Runtime | **Node.js LTS** | 22 LTS (mínimo) / 24 LTS (preferido) | Estable, soporte largo, ecosistema completo. |
| Lenguaje | **TypeScript** | 5.x | Tipado estricto, menos errores, mejor para IA. |
| Framework full-stack | **Next.js (App Router)** | 15.x (React 19) | SSR/SSG para landings de alta conversión + SEO, API routes/Server Actions, panel admin, una sola base de código. |
| UI | **React** | 19.x | Estándar, enorme ecosistema. |
| Estilos | **Tailwind CSS** | v4 | Rápido, consistente, ideal para design system minimalista/tech. |
| Componentes | **shadcn/ui** (Radix UI) | última | Accesibles, headless, totalmente personalizables, sin lock-in. |
| Animaciones | **Framer Motion** + **canvas-confetti** | última | Microinteracciones y el "show" del sorteo. |
| Formularios | **React Hook Form** + **Zod** | última | Validación robusta cliente+servidor con un solo schema. |
| Estado servidor | **TanStack Query** | v5 | Caching, sincronización, optimistic UI. |
| ORM | **Prisma** | 6.x | Migraciones, tipado, productividad; (alternativa: Drizzle). |
| Base de datos | **PostgreSQL** | 16/17 | Ver decisión §3.3. |
| Cola/Jobs | **BullMQ + Redis** | última | Recordatorios programados y envíos masivos fiables. |
| Email | **Amazon SES vía SMTP** (Nodemailer) | — | Requisito del cliente; barato y con alta entregabilidad. |
| Realtime | **Supabase Realtime** o **Socket.IO** | última | Sorteo en vivo y dashboard de check-in en tiempo real. |
| QR | **qrcode** (generar) + **@zxing/library / html5-qrcode** (escanear) | última | Generación y escaneo desde el navegador. |
| Pagos | **Stripe** (+ interfaz de pasarela genérica) | última | Internacional; estructura para añadir locales. |
| IA / LLM | **Capa proveedor-agnóstica** (OpenAI / Anthropic / Azure OpenAI) + **Vercel AI SDK** | última | Asistente conversacional M14; cambiable sin tocar el producto. |
| Embeddings / RAG | **pgvector** (en el mismo Postgres) | última | Búsqueda semántica del conocimiento sin infra extra. |
| Exportación | **exceljs** / **papaparse** | última | Reportes a Excel/CSV. |
| Auth | **Auth.js (NextAuth) v5** o **Supabase Auth** | última | Según DB elegida (ver §3.3). |
| Tests | **Vitest** + **Playwright** | última | Unit/integración + E2E. |
| Lint/format | **ESLint** + **Prettier** + **Biome** (opcional) | última | Calidad y consistencia. |
| Contenedores | **Docker** + docker-compose | — | Reproducibilidad y despliegue. |
| Monorepo (opcional) | **Turborepo / pnpm workspaces** | última | Si se separa `web`, `worker`, `packages/ui`. |

## 3.2 Estructura de proyecto propuesta

```
eventflow/
├─ apps/
│  ├─ web/                # Next.js (landing pública + panel admin + API)
│  │  ├─ app/
│  │  │  ├─ (public)/     # landing por tenant, página de evento, registro, confirmación
│  │  │  ├─ (admin)/      # panel org-admin
│  │  │  ├─ (superadmin)/ # panel plataforma
│  │  │  ├─ (checkin)/    # PWA de escaneo
│  │  │  ├─ (raffle)/     # pantalla de sorteo en vivo
│  │  │  └─ api/          # route handlers / webhooks (SES, Stripe)
│  │  └─ ...
│  └─ worker/             # consumidor BullMQ (emails, recordatorios, jobs)
├─ packages/
│  ├─ db/                 # Prisma schema + cliente + migraciones
│  ├─ ui/                 # design system (shadcn/ui extendido)
│  ├─ emails/             # plantillas (React Email)
│  ├─ core/               # lógica de dominio compartida (servicios, validaciones Zod)
│  └─ config/             # eslint, tsconfig, tailwind preset
├─ docker-compose.yml
└─ PRD/                   # este documento
```

## 3.3 Decisión de Base de Datos (recomendación firme)

Evaluamos tus opciones: **Appwrite self-hosted**, **Supabase**, **MongoDB**, **Baserow.io**.

### Análisis
- Los datos del producto son **fuertemente relacionales**: tenant → eventos → registros → estados → check-ins → pagos → sorteos. Necesitas joins, agregaciones para reportes, integridad referencial y exportaciones precisas. ⇒ **PostgreSQL (relacional) es superior a MongoDB** aquí.
- **Baserow.io** es excelente como *Airtable alternativo*/hoja de datos, pero **no** como base de datos transaccional de una app SaaS con concurrencia (check-in simultáneo, sorteos en vivo). Útil a lo sumo como destino de reportes, no como core. ⇒ **Descartado como DB principal.**
- **Appwrite self-hosted**: bueno y lo tienes, pero te ata a su modelo (BaaS), su query es más limitado para reportes complejos, y operarlo/escalarlo es tu responsabilidad. Sirve, pero te frena en reporting y multi-tenant fino.
- **Supabase**: PostgreSQL gestionado + **Auth + Storage + Realtime + RLS** integrados. RLS encaja perfecto con el **aislamiento multi-tenant**. Free tier generoso, escala por uso, y es **self-hostable** si más adelante quieres bajar costes/controlar todo. Realtime resuelve el **sorteo en vivo** y el **dashboard de check-in** sin montar infra extra.

### Recomendación
**Usar PostgreSQL, gestionado vía Supabase** (Auth + Storage + Realtime + RLS).
- **Por qué es lo mejor para ganar dinero rápido sin gastar mucho:** empiezas en free/tier bajo, no pagas por tenant, y el mismo Postgres te sirve para reporting serio y exportaciones. RLS te da el aislamiento multi-tenant "gratis" como red de seguridad.
- **ORM:** Prisma sobre el Postgres de Supabase (o Drizzle si se prefiere SQL-first).
- **Auth:** Supabase Auth (magic links, OAuth, email/password) — encaja con el modelo de enlaces con token para asistentes.
- **Camino de salida sin lock-in:** como es **Postgres estándar**, puedes migrar a un Postgres self-hosted (incluido Supabase self-hosted) o a un proveedor más barato sin reescribir el modelo de datos.

**Alternativa válida si quieres todo self-hosted desde el día 1:** Postgres self-hosted + Prisma + Auth.js + MinIO (storage) + Redis. Más control, más trabajo de DevOps.

> Decisión final de despliegue (cloud Supabase vs self-host) se registra en `DECISIONS.md` antes de la Fase 0. El **modelo de datos no cambia** en ningún caso.

## 3.4 Infraestructura y despliegue

- **Web (Next.js):** Vercel (rápido para empezar) o contenedor en VPS/Fly.io/Render.
- **Worker (BullMQ):** contenedor separado en VPS/Fly.io/Render (necesita proceso persistente; no usar serverless para los jobs programados).
- **Redis:** Upstash (serverless, barato) o Redis gestionado.
- **DB/Storage/Realtime:** Supabase.
- **Email:** Amazon SES (SMTP) — verificar dominio/DKIM/SPF; salir del sandbox de SES.
- **Observabilidad:** Sentry (errores) + logs estructurados (pino) + métricas básicas.

## 3.5 Variables de entorno (contrato)
```
# App
APP_BASE_URL=
NODE_ENV=
# DB
DATABASE_URL=                 # Postgres (pooled)
DIRECT_URL=                   # Postgres (migraciones)
# Auth / Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=
# Email (Amazon SES SMTP)
SES_SMTP_HOST=
SES_SMTP_PORT=587
SES_SMTP_USER=
SES_SMTP_PASS=
SES_REGION=
MAIL_FROM_DEFAULT=
# Redis / Jobs
REDIS_URL=
# Pagos
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
# WhatsApp / Twilio (estructura, fase posterior)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
WHATSAPP_PROVIDER=            # twilio | meta | none
# IA / LLM (asistente M14)
LLM_PROVIDER_DEFAULT=         # openai | anthropic | azure_openai
LLM_API_KEY=                  # key del pool de plataforma (BYOK por tenant en integrations)
LLM_MODEL_DEFAULT=
EMBEDDINGS_MODEL=
# Observabilidad
SENTRY_DSN=
```
