# DECISIONS — Registro de decisiones (ADR ligero)

> Formato: fecha · decisión · motivo · alternativas · estado. Mantener actualizado por la IA según `PRD/10-GUIA-EJECUCION-IA.md`.

---

### ADR-001 · Gestor de paquetes y monorepo
- **Fecha:** 2026-06-19
- **Decisión:** `pnpm` workspaces + **Turborepo** para el monorepo.
- **Motivo:** instalación rápida, enlazado eficiente de paquetes internos, caché de tareas con Turbo.
- **Alternativas:** npm/yarn workspaces, Nx.
- **Estado:** Aceptada.

### ADR-002 · Runtime Node.js
- **Fecha:** 2026-06-19
- **Decisión:** **Node.js 22 LTS** (verificado en el entorno: `v22.22.3`).
- **Motivo:** LTS estable y disponible en el sandbox; soporte largo. (Node 24 también disponible; se mantiene 22 por estabilidad.)
- **Estado:** Aceptada.

### ADR-003 · Framework full-stack
- **Fecha:** 2026-06-19
- **Decisión:** **Next.js (App Router) + React 19 + TypeScript estricto**.
- **Motivo:** SSR/SSG para landings de alta conversión, API routes/Server Actions, un solo código para público + admin.
- **Estado:** Aceptada.

### ADR-004 · Estilos y componentes
- **Fecha:** 2026-06-19
- **Decisión:** **Tailwind CSS v4** + **shadcn/ui** (Radix) + Framer Motion.
- **Motivo:** estética minimalista/tech, accesibilidad, sin lock-in.
- **Estado:** Aceptada.

### ADR-005 · Base de datos y ORM
- **Fecha:** 2026-06-19
- **Decisión:** **PostgreSQL** (gestionado vía **Supabase**: Auth + Storage + Realtime + RLS) + **Prisma** ORM. **pgvector** para RAG del asistente IA.
- **Motivo:** datos relacionales, reporting, aislamiento multi-tenant por RLS, realtime para sorteo/check-in, bajo coste inicial, sin lock-in (Postgres estándar).
- **Alternativas:** Appwrite self-hosted (limita reporting), MongoDB (no relacional), Baserow (no transaccional).
- **Estado:** Aceptada. **PENDIENTE de confirmar despliegue:** Supabase cloud vs Supabase self-host (ver QUESTIONS Q-01).

### ADR-006 · Colas y jobs
- **Fecha:** 2026-06-19
- **Decisión:** **BullMQ + Redis** en un proceso `worker` separado.
- **Motivo:** recordatorios programados y envíos masivos fiables (no serverless para cron persistente).
- **Estado:** Aceptada.

### ADR-007 · Email
- **Fecha:** 2026-06-19
- **Decisión:** **Amazon SES vía SMTP** con Nodemailer (requisito del cliente).
- **Estado:** Aceptada.

### ADR-008 · Capa LLM (asistente IA)
- **Fecha:** 2026-06-19
- **Decisión:** Capa **proveedor-agnóstica** (OpenAI/Anthropic/Azure) + embeddings en **pgvector**.
- **Motivo:** evitar lock-in, permitir BYOK por tenant, control de coste.
- **Estado:** Aceptada. **PENDIENTE:** proveedor/modelo por defecto (ver QUESTIONS Q-02).
