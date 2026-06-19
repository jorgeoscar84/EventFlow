# PROGRESS — Estado de construcción por fase

> Marcar CA (criterios de aceptación) con [x] cuando estén verificados. Ver fases en `PRD/11-ROADMAP.md`.

## Fase 0 — Fundaciones (setup) · EN CURSO
- [x] Documentos de trabajo (DECISIONS, QUESTIONS, PROGRESS, README)
- [x] Monorepo pnpm + Turborepo + TS base + .gitignore + .env.example
- [x] `packages/db` con schema Prisma del modelo de datos (`04` + `12`)
- [x] `packages/config`, `packages/core`, `packages/ui` mínimos
- [x] `apps/web` (Next.js + Tailwind v4 + TS estricto) con landing placeholder + health route
- [x] `apps/worker` (stub BullMQ)
- [ ] Conexión real a Postgres + primera migración + RLS base + seeds (requiere credenciales — Q-01)
- [ ] Auth + resolución de tenant por subdominio
- [x] Verificación: `pnpm install` + `typecheck`/`build`

**Salida esperada:** "hello tenant" — login, sesión con `tenant_id`, RLS probada. *(Auth/RLS pendientes de credenciales de DB.)*

## Fase 1 — Núcleo Multi-Tenant · PENDIENTE
- [ ] M1 Auth + RBAC
- [ ] M2 Super Admin (tenants, planes)
- [ ] M12 Equipo y roles
- [ ] M3 Gestión de eventos (CRUD + wizard)
- [ ] Branding por tenant

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
