# PROGRESS — Estado de construcción por fase

> Marcar CA (criterios de aceptación) con [x] cuando estén verificados. Ver fases en `PRD/11-ROADMAP.md`.

## Fase 0 — Fundaciones (setup) · EN CURSO
- [x] Documentos de trabajo (DECISIONS, QUESTIONS, PROGRESS, README)
- [x] Monorepo pnpm + Turborepo + TS base + .gitignore + .env.example
- [x] `packages/db` con schema Prisma del modelo de datos (`04` + `12`)
- [x] `packages/config`, `packages/core`, `packages/ui` mínimos
- [x] `apps/web` (Next.js + Tailwind v4 + TS estricto) con landing placeholder + health route
- [x] `apps/worker` (stub BullMQ)
- [x] Conexión real a Postgres + primera migración + RLS base + seeds (Supabase us-west-2, pooler IPv4)
- [ ] Auth + resolución de tenant por subdominio (resolución hecha; falta login/sesión)
- [x] Verificación: `pnpm install` + `typecheck`/`build`

**Salida esperada:** "hello tenant" — login, sesión con `tenant_id`, RLS probada. *(Migración + RLS + seeds aplicados y verificados; falta el login.)*

## Fase 1 — Núcleo Multi-Tenant · EN CURSO
- [x] RBAC: catálogo de permisos + roles de sistema + helpers (`packages/core/rbac.ts`) + tests
- [x] Resolución de tenant por host/subdominio (`packages/core/tenant.ts`) + tests
- [x] Middleware de tenant en web (`apps/web/middleware.ts`, header `x-tenant-slug`)
- [x] Tokens firmados HMAC para QR/confirmación (`apps/web/lib/tokens.ts`)
- [x] Migración inicial aplicada (~35 tablas) + extensiones pgcrypto/vector + RLS + seeds (Supabase us-west-2)
- [x] M2 (base): servicio de aprovisionamiento de tenant (`provisionTenant`) — crea tenant + roles de sistema + permisos + admin · verificado contra DB real
- [x] M2 (API): `listTenants`/`getTenant`/`setTenantStatus` + endpoints `GET/POST /api/v1/admin/tenants` (guard super admin)
- [x] M1 (base): Supabase Auth server client + `getCurrentUser`/`requireUser`/`requireSuperAdmin`/`requirePermission`
- [x] M3 (servicio+API): eventos CRUD (`createEvent` con slug único, `listEvents`, `getEvent`, `updateEvent`, `publishEvent`, `getEventStats`) + endpoints `GET/POST /api/v1/events`, `GET/PATCH /api/v1/events/[id]`, `POST .../publish` · verificado contra DB real (incl. aislamiento entre tenants)
- [x] Contexto de tenant para Prisma (`withTenant`, set app.tenant_id)
- [x] M1 Auth UI: páginas login (Supabase Auth) + logout + guardas de sesión en layouts · verificado por HTTP (307/401)
- [x] M2 Panel Super Admin (UI): lista de empresas + alta de empresa (crea tenant + usuario Auth con contraseña temporal)
- [x] M3 Panel organizador (UI): lista de eventos + formulario de creación
- [x] Design system base (Button, Input, Card, Badge, AppShell) estilo minimalista/tech
- [x] Bootstrap de Super Admin (`scripts/bootstrap-superadmin.ts`) + carga de .env raíz en Next
- [ ] M12 Equipo y roles (UI) — pendiente
- [ ] Branding por tenant — pendiente
- [ ] M3 Wizard multi-paso + edición avanzada — pendiente (form básico hecho)

**Fase 1 funcionalmente operativa:** login → super admin crea empresa → admin de empresa entra y crea eventos. Verificado: arranque del server, guardas (307/401), servicios y aislamiento contra DB real.

## Fase 2 — Público + Registro + Confirmación · PENDIENTE
- [ ] M4 Landing + página de evento · M5 Registro · M6 Confirmación · M7(parcial) Email SES · M13 digital

## Fase 3 — Check-in QR (M8) · PENDIENTE
## Fase 4 — Mensajería completa (M7) · PENDIENTE
## Fase 5 — Pagos (M11) · PENDIENTE
## Fase 6 — Reportes y export (M10) · PENDIENTE
## Fase 7 — Sorteos en vivo (M9) · PENDIENTE
## Fase 8 — Pulido / SaaS · PENDIENTE
## Fase 9 — Asistente IA (M14) · PENDIENTE

---

### Notas de la última sesión
- Entorno: Node v22.22.3, pnpm 10.28.1, internet abierto.
- Scaffolding creado y verificado (typecheck/build). Próximo paso real de negocio: definir despliegue de DB (Q-01) para migraciones y empezar Fase 1 (Auth + multi-tenant).
