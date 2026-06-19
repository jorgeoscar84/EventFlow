# 11 — Roadmap por Fases

> Construcción incremental. **No saltar fases.** Cada fase termina con sus *gates* (`10.6`). Estimaciones relativas (ajustables).

## Fase 0 — Fundaciones (setup)
- Monorepo, TypeScript estricto, Tailwind v4 + shadcn/ui, ESLint/Prettier, CI, Docker, `.env.example`.
- Conexión a Postgres (Supabase), Prisma, primeras migraciones, RLS base, seeds.
- Auth.js/Supabase Auth + resolución de tenant por subdominio.
- `DECISIONS.md` con versiones reales y decisión de despliegue de DB.
**Salida:** "hello tenant" — login, sesión con `tenant_id`, RLS probada.

## Fase 1 — Núcleo Multi-Tenant (MVP administrativo)
- M1 Auth + RBAC, M2 Super Admin (crear/gestionar tenants y planes), M12 Equipo y roles.
- M3 Gestión de eventos (CRUD + wizard, presencial/digital).
- Branding por tenant.
**Gates:** Seguridad (aislamiento), Datos.

## Fase 2 — Público + Registro + Confirmación (corazón anti no-show)
- M4 Landing tenant + página de evento (constructor básico).
- M5 Registro (campos base + personalizados: cédula, provincia).
- M6 Confirmación de asistencia (tokens, reconfirmación).
- M7 Email transaccional con **Amazon SES** (confirmación + reconfirmación).
- M13 lógica de eventos digitales (revelado de enlace a confirmados).
**Gates:** Rendimiento (landing), UX, Seguridad (tokens, rate limit).

## Fase 3 — Operación en vivo: Check-in QR
- Generación de QR firmado por registro.
- M8 PWA de escaneo (multi-asesor, multi-puerta), validación OK/duplicado/inválido, dashboard en vivo (realtime), modo offline.
**Gates:** Rendimiento (escaneo < 2s, concurrencia), Seguridad (firma QR).

## Fase 4 — Automatización de mensajería completa
- M7 motor completo: campañas programadas (absolutas y relativas), worker BullMQ, recordatorios 24h/1h, agradecimiento.
- Webhooks SES (bounce/complaint/delivery) → `message_logs`.
- Estructura de providers WhatsApp/Twilio (config lista, stubs).
**Gates:** Fiabilidad (reintentos, idempotencia), Entregabilidad (DKIM/SPF/DMARC, fuera de sandbox).

## Fase 5 — Pagos
- M11 Stripe checkout + webhooks idempotentes + control manual pagó/no pagó + interfaz de pasarela genérica.
**Gates:** Seguridad (webhooks), Datos (conciliación pagos).

## Fase 6 — Reportes y Exportación
- M10 dashboards de funnel + tabla filtrable + export a Excel/CSV (en background) con todos los campos y estados.
**Gates:** Datos (cuadre de cifras), Rendimiento (export 10k+).

## Fase 7 — Sorteos en vivo (el show)
- M9 configuración + pantalla show (animación bombo + tambores + confeti) + control presentador (presente/ausente, re-sorteo) + sincronización realtime + historial auditable.
**Gates:** UX (60fps, audio, confeti), Datos (semilla auditable, no doble ganador).

## Fase 8 — Pulido, SaaS y multi-tenant comercial
- Límites de plan / enforcement de uso, facturación SaaS (Stripe Billing), dominios personalizados.
- i18n completo, accesibilidad AA, observabilidad (Sentry, métricas), hardening.
- Optimización de conversión de landings (A/B básico, prueba social, urgencia).
**Gates:** todos los gates globales + revisión final de seguridad y rendimiento.

## Fase 9 — Asistente IA Conversacional (M14)
- Esquema + `pgvector` + pipeline de ingesta de conocimiento (auto del evento + FAQ + documentos + URLs).
- Abstracción de proveedor LLM + RAG + guardarraíles anti-alucinación + widget de chat web.
- Configuración por cuenta y por evento con herencia + vista previa en vivo.
- Tools acotadas (registro, estado con verificación de identidad, reenvío de QR, escalado a humano).
- Analítica (deflexión, top preguntas, vacíos de conocimiento) + control de coste por plan + (opcional) canal WhatsApp.
**Gates:** Seguridad (aislamiento tenant/evento, PII, verificación), Anti-alucinación (no responde fuera de contexto, datos críticos en vivo), Coste (límites por plan), UX. Detalle en `12-ASISTENTE-IA.md`.

> Nota de secuencia: la Fase 9 puede adelantarse a una versión mínima (solo widget + RAG del evento + FAQ) tras la Fase 2 si se prioriza el impacto en conversión, dejando tools/analítica/WhatsApp para después.

---

## Mapa Fase → Módulos
| Fase | Módulos |
|------|---------|
| 0 | infra/auth base |
| 1 | M1, M2, M3, M12 |
| 2 | M4, M5, M6, M7(parcial), M13 |
| 3 | M8 |
| 4 | M7(completo) |
| 5 | M11 |
| 6 | M10 |
| 7 | M9 |
| 8 | SaaS/pulido |
| 9 | M14 (Asistente IA) |

## Entregable final
Aplicación SaaS multi-tenant operativa: tú como **super admin** habilitas empresas/aliados; cada empresa crea y gestiona eventos presenciales y digitales con landing de alta conversión, registro con confirmación anti-no-show, mensajería automatizada por SES (y estructura WhatsApp), check-in por QR multi-asesor, pagos, reportes exportables, sorteos en vivo tipo show y un **asistente IA conversacional configurable por cuenta y por evento** que atiende a los clientes finales con información verificada.
