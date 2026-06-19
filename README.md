# Eventflow — Plataforma de Eventos Multi-Tenant

SaaS multi-tenant para crear, promocionar, gestionar y medir **eventos presenciales y digitales**: registro con confirmación anti-no-show, check-in por QR, mensajería automatizada (Amazon SES), pagos, reportes exportables, sorteos en vivo y un asistente IA conversacional por evento.

> Especificación completa en [`/PRD`](./PRD/00-INDICE.md). Decisiones técnicas en [`DECISIONS.md`](./DECISIONS.md). Estado en [`PROGRESS.md`](./PROGRESS.md).

## Stack
- Node.js 22 LTS · TypeScript estricto
- Next.js (App Router) + React 19 · Tailwind v4 · shadcn/ui
- PostgreSQL (Supabase: Auth/Storage/Realtime/RLS) + Prisma · pgvector (RAG)
- BullMQ + Redis (jobs) · Amazon SES (email) · Stripe (pagos)

## Estructura (monorepo pnpm + Turborepo)
```
eventflow/
├─ apps/
│  ├─ web/      # Next.js: landing pública + panel admin + API
│  └─ worker/   # consumidor BullMQ (emails, recordatorios)
├─ packages/
│  ├─ db/       # Prisma schema + cliente
│  ├─ core/     # lógica de dominio + validaciones Zod
│  ├─ ui/       # design system (tokens)
│  └─ config/   # tsconfig/eslint compartidos
└─ PRD/         # documento de producto e ingeniería
```

## Requisitos
- Node.js 22 LTS, pnpm 10+

## Primeros pasos
```bash
pnpm install
cp .env.example .env        # completar credenciales (DB, SES, etc.)
pnpm dev                    # arranca apps en modo desarrollo
pnpm build                  # build de producción
pnpm typecheck              # verificación de tipos
pnpm lint                   # lint
```

> El arranque con base de datos requiere `DATABASE_URL` (Postgres). Ver `DECISIONS.md` (ADR-005) y `QUESTIONS.md` (Q-01).
