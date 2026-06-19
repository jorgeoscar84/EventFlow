# 13 — Cambios y Mejoras de Implementación

> Este documento registra las **decisiones y mejoras** adoptadas durante la construcción real, que complementan o ajustan el PRD original. Todo el código está en `main` de `jorgeoscar84/EventFlow` y verificado contra la base de datos real (Supabase, región us-west-2).

## 13.1 Sistema visual premium (ajusta `08-UX-UI-DESIGN-SYSTEM.md`)
- **Tipografía:** se adoptó **Fraunces** (serif display variable, con ejes ópticos/SOFT/WONK) para titulares + **Inter** para UI. Combinación editorial premium, no genérica.
- **Texturas/atmósfera:** capa de **grano** SVG (sin imágenes externas) + **aurora** (gradiente de marca difuminado) en páginas públicas.
- **Animaciones (con propósito):** `framer-motion` para reveals al scroll, cascada en grids, countdown con dígitos deslizantes, transiciones del widget y del show.
- **Sorteo:** `canvas-confetti` + **Web Audio API** (tambores + boom) para el "show".
- **Acento por tenant:** se inyecta vía CSS variables (`--color-brand-*`) en runtime desde el branding del tenant.

## 13.2 Routing público basado en ruta (complementa `02` §2.3)
- Para que funcione en cualquier entorno (incl. local/sandbox sin subdominios), las páginas públicas usan **rutas**:
  - Evento: `/o/{tenant}/{evento}`
  - Registro: `/o/{tenant}/{evento}/registro`
  - Pase con QR: `/pase/{qrToken}`
  - Confirmación: `/confirmar/{token}`
  - Show de sorteo: `/sorteo/{raffleId}`
  - PWA de check-in: `/checkin` y `/checkin/{eventId}`
- El middleware de resolución por subdominio (`x-tenant-slug`) sigue presente; el modelo soporta ambas estrategias. Subdominios/dominios personalizados quedan para despliegue productivo.

## 13.3 Motor de mensajería por DB-polling (ajusta `03` y `07`)
- **Mejora:** el motor de recordatorios/reconfirmación se implementó como **scheduler por sondeo de base de datos** en `apps/worker` (cada 60s materializa campañas y procesa envíos vencidos), **eliminando la dependencia de Redis/BullMQ** para esta función.
- Beneficio: menos infraestructura y coste; sólo requiere DB + SES. El envío de email es **best-effort** (no rompe el flujo si SES aún no está configurado).
- BullMQ/Redis siguen siendo una opción válida para cargas muy altas (documentado), pero el MVP no lo necesita.

## 13.4 Branding por tenant (complementa `02` §2.4 y `04`)
- Se añadió la columna **`branding JSONB`** a `Tenant` (migración `20260619100000_tenant_branding`): `{ displayName, accentColor, logoUrl }`.
- Editable en `/dashboard/settings` y aplicado en la landing pública (color de acento, logo y nombre visible).

## 13.5 Asistente IA — embeddings locales de respaldo (ajusta `12`)
- RAG sobre **pgvector** ya operativo. Para funcionar **sin clave de LLM**, se implementó un **embedding local determinista** (bag-of-words hasheado, 1536 dims) y respuestas **extractivas grounded**: el agente responde sólo con el conocimiento recuperado; si no hay match confiable, **admite que no sabe** (guardarraíl anti-alucinación verificado).
- La **capa de proveedor LLM** (OpenAI/Anthropic) queda como hook: al definir `LLM_API_KEY`, las respuestas pasan a ser conversacionales y los embeddings de mayor calidad, sin cambiar el modelo de datos.
- Aislamiento por tenant/evento verificado en la recuperación.

## 13.6 Estado de implementación por fase
| Fase | Módulos | Estado |
|------|---------|--------|
| 0 | Fundaciones (monorepo, DB, RLS) | ✅ |
| 1 | Auth + Super Admin + Eventos (M1/M2/M3/M12) | ✅ |
| 2 | Público + Registro + Confirmación (M4/M5/M6/M7 parcial/M13) | ✅ |
| 3 | Check-in QR (M8) | ✅ |
| 4 | Mensajería completa (M7) | ✅ |
| 5 | Pagos (M11) | ✅ |
| 6 | Reportes y export (M10) | ✅ |
| 7 | Sorteos en vivo (M9) | ✅ |
| 8 | SaaS / pulido | ✅ (núcleo) |
| 9 | Asistente IA (M14) | ✅ |

Cada fase incluye scripts de verificación en `packages/db/scripts/verify-*.ts` ejecutados contra la DB real.

## 13.7 Credenciales/integraciones pendientes (para producción)
- **Amazon SES** (`SES_SMTP_*`): activa el envío real de emails (confirmación + recordatorios).
- **Stripe** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`): activa el cobro online.
- **LLM** (`LLM_API_KEY`): activa respuestas conversacionales del asistente.
- **WhatsApp/Twilio**: estructura lista (`integrations`), pendiente de credenciales.
- Recomendado: **rotar** las claves de Supabase compartidas durante el desarrollo.

## 13.8 Cómo ejecutar
```bash
pnpm install
# .env con DATABASE_URL/DIRECT_URL (pooler Supabase) + claves
pnpm --filter @eventflow/db exec prisma migrate deploy
pnpm --filter @eventflow/db exec tsx scripts/seed-demo-event.ts   # demo opcional
pnpm --filter @eventflow/web dev        # app web (panel + público)
pnpm --filter @eventflow/worker dev     # scheduler de mensajería
```
Super Admin de demo creado: `admin@eventflow.app`. Evento demo: `/o/demo/future-summit-2026`.
