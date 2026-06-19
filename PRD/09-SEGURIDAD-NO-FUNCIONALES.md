# 09 — Seguridad, Privacidad y Requisitos No Funcionales

## 9.1 Seguridad
- **Aislamiento multi-tenant** en dos capas: app (contexto `tenant_id`) + **RLS** en Postgres.
- **AuthZ** por RBAC; verificación de permisos en cada endpoint (no solo en UI).
- **Tokens firmados (HMAC)** para QR y confirmación; expiración tras el evento; un solo uso lógico para confirmación.
- **Cifrado**: credenciales SMTP/integraciones cifradas en reposo (KMS o `pgcrypto`/clave de app). TLS en tránsito.
- **Rate limiting** y anti-abuso en endpoints públicos (registro, confirmación, scan).
- **Webhooks** verificados por firma (Stripe, SES/SNS, Twilio); idempotentes.
- **Anti-spam** en registro: honeypot, rate limit por IP, captcha opcional.
- **OWASP Top 10**: validación de entrada (Zod), salida escapada, sin SQL crudo sin parametrizar (Prisma), CSP, headers seguros, protección CSRF en acciones de sesión.
- **Secrets** solo en variables de entorno / gestor de secretos; nunca en el repo.
- **Auditoría** de acciones sensibles (impersonación, export, cambios de pago, borrados).

## 9.2 Privacidad y cumplimiento
- Datos personales (nombre, email, teléfono, **cédula**) tratados con minimización y consentimiento explícito.
- **Cédula/ID**: dato sensible → cifrado y acceso restringido por permiso; mostrar enmascarado salvo a roles autorizados.
- Política de **retención** y **borrado** por evento/tenant; exportación y derecho de supresión (RGPD-like / leyes locales).
- Enlaces de **baja** (unsubscribe) en emails de marketing.
- Aviso de privacidad y términos por tenant en la landing.

## 9.3 Rendimiento
- Landing: LCP < 2.5s móvil; SSG/ISR + CDN.
- API p95 < 300ms en lecturas comunes.
- **Check-in**: respuesta de escaneo < 2s incluso con red lenta (validación local del token + confirmación async).
- **Concurrencia**: soportar múltiples asesores escaneando en simultáneo sin condiciones de carrera (transacción + constraint para evitar doble check-in).

## 9.4 Escalabilidad
- Stateless en web; sesiones en cookie/DB. Worker escalable horizontalmente (BullMQ).
- DB con índices definidos (`04`), pooling de conexiones (PgBouncer/Supabase pooler).
- Exportaciones grandes y envíos masivos en background (no en request).

## 9.5 Fiabilidad
- Reintentos en jobs; dead-letter queue; alertas.
- Backups automáticos de DB + storage; prueba de restauración.
- Migraciones versionadas (Prisma migrate) reversibles.

## 9.6 Observabilidad
- **Logs** estructurados (pino) con `tenant_id`/`event_id`/`request_id`.
- **Errores**: Sentry (web + worker).
- **Métricas**: funnel, entregabilidad email, tiempos de check-in, salud de colas.
- Health checks (`/healthz`) para web y worker.

## 9.7 Internacionalización
- i18n desde el inicio (es por defecto; estructura para más idiomas). Fechas/horas con zona horaria del evento. Moneda configurable por tenant/evento.

## 9.8 Accesibilidad
- WCAG 2.1 AA en flujos públicos y admin.

### Criterios de Aceptación (CA-09)
- CA-09.1: Tests automatizados verifican aislamiento entre tenants (app + RLS).
- CA-09.2: No hay secretos en el repositorio (escaneo en CI).
- CA-09.3: Webhooks rechazan firmas inválidas y no duplican efectos.
- CA-09.4: La cédula se almacena cifrada y se muestra enmascarada salvo permiso.
