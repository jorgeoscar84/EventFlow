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
- **Estado:** Aceptada. **Despliegue confirmado:** Supabase cloud, proyecto `uyhsitbpwygteumjpzfl`, región **us-west-2**. Conexión vía **pooler IPv4** (el host directo `db.*.supabase.co` es solo IPv6 y el sandbox no tiene IPv6): app en pooler transacción `:6543?pgbouncer=true`, migraciones en pooler sesión `:5432`.

### ADR-009 · RLS y rol de conexión
- **Fecha:** 2026-06-19
- **Decisión:** Habilitar RLS + políticas `tenant_isolation` en todas las tablas con `tenantId`. La **primera línea de defensa** es el filtrado por `tenantId` en la capa de aplicación (`packages/core` + `packages/db/tenant-context`).
- **Motivo:** Prisma se conecta con el rol propietario (`postgres`), que por defecto ignora RLS. Las políticas quedan activas para cuando se introduzca un rol restringido (fase de hardening). No se usa `FORCE` para no romper worker/superadmin.
- **Estado:** Aceptada.

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
