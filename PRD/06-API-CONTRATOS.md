# 06 — Contratos de API

> Estilo: REST sobre Next.js Route Handlers + Server Actions para formularios. Todo input validado con **Zod** (mismo schema cliente/servidor). Respuestas JSON consistentes. Auth por sesión (panel) y por **token firmado** (asistentes). Multi-tenant: `tenant_id` siempre del contexto, nunca del cliente.

## 6.1 Convenciones
- Base: `/api/v1`.
- Respuesta éxito: `{ "data": ..., "meta": {...} }`.
- Respuesta error: `{ "error": { "code": "STRING_CODE", "message": "...", "details": [...] } }`.
- Paginación: `?page=1&pageSize=50` → `meta.pagination`.
- Idempotencia en webhooks (header `Idempotency-Key` / verificación de firma).
- Rate limiting en endpoints públicos (registro, confirmación).

## 6.2 Endpoints principales

### Super Admin (rol global)
```
POST   /api/v1/admin/tenants                 # crear tenant
GET    /api/v1/admin/tenants                  # listar
PATCH  /api/v1/admin/tenants/:id              # suspender/activar/plan
GET    /api/v1/admin/metrics                  # KPIs globales
POST   /api/v1/admin/impersonate/:userId      # soporte (auditado)
GET    /api/v1/admin/plans  | POST | PATCH    # planes
```

### Eventos (org)
```
POST   /api/v1/events
GET    /api/v1/events?status=&q=&page=
GET    /api/v1/events/:id
PATCH  /api/v1/events/:id
POST   /api/v1/events/:id/publish
POST   /api/v1/events/:id/duplicate
DELETE /api/v1/events/:id
GET    /api/v1/events/:id/stats               # funnel
```

### Landing / bloques
```
GET    /api/v1/events/:id/landing
PUT    /api/v1/events/:id/landing/blocks      # reordenar/guardar bloques
```

### Campos personalizados y entradas
```
GET/POST/PATCH/DELETE /api/v1/events/:id/custom-fields
GET/POST/PATCH/DELETE /api/v1/events/:id/ticket-types
```

### Registro público (sin auth, rate-limited)
```
POST   /api/v1/public/events/:slug/register
       body: { fullName, email, phone, customFields:{...}, ticketTypeId?, consentMarketing }
       resp: { registrationId, status, qrUrl, requiresPayment, paymentUrl? }
GET    /api/v1/public/confirm/:token          # página de reconfirmación (GET muestra, POST confirma)
POST   /api/v1/public/confirm/:token          # -> status confirmed
GET    /api/v1/public/registration/:qrToken/pass   # datos del pase + QR
```

### Check-in (PWA, rol staff)
```
POST   /api/v1/checkin/scan
       body: { qrToken, eventId, gate }
       resp: { result: "ok"|"duplicate"|"invalid"|"not_confirmed", attendee?:{name,...} }
GET    /api/v1/checkin/events/:id/live         # stats en vivo (o canal realtime)
```

### Mensajería / campañas
```
GET/POST/PATCH /api/v1/events/:id/campaigns
POST   /api/v1/events/:id/campaigns/:cid/test  # envío de prueba
GET    /api/v1/tenants/me/smtp | PUT           # config SES SMTP
POST   /api/v1/tenants/me/smtp/verify          # verificar envío
GET/POST /api/v1/tenants/me/integrations       # whatsapp/twilio
POST   /api/v1/webhooks/ses                    # SNS: delivery/bounce/complaint/open/click
POST   /api/v1/webhooks/twilio                 # estados whatsapp/sms
```

### Pagos
```
POST   /api/v1/public/payments/checkout        # crea sesión Stripe
POST   /api/v1/webhooks/stripe                 # idempotente
PATCH  /api/v1/registrations/:id/payment       # marcar pago manual
```

### Reportes
```
GET    /api/v1/events/:id/registrations?status=&paid=&q=&page=
POST   /api/v1/events/:id/export               # genera Excel/CSV (job) -> { downloadUrl }
```

### Sorteos
```
GET/POST/PATCH /api/v1/events/:id/raffles
POST   /api/v1/raffles/:id/start
POST   /api/v1/raffles/:id/draw                # ejecuta una ronda -> ganador
POST   /api/v1/raffles/:id/rounds/:rid/redraw  # re-sortear (no presente)
POST   /api/v1/raffles/:id/rounds/:rid/confirm # validar ganador presente
GET    /api/v1/raffles/:id/winners
```

## 6.3 Ejemplo de contrato detallado — Registro

**Request**
```json
POST /api/v1/public/events/summit-2026/register
{
  "fullName": "Ana Pérez",
  "email": "ana@example.com",
  "phone": "+18095551234",
  "customFields": { "cedula": "001-1234567-8", "provincia": "Santo Domingo" },
  "ticketTypeId": null,
  "consentMarketing": true
}
```
**Response 201**
```json
{
  "data": {
    "registrationId": "uuid",
    "status": "registered",
    "qrUrl": "https://.../registration/{qrToken}/pass",
    "requiresPayment": false
  }
}
```
**Errores:** `409 DUPLICATE_REGISTRATION`, `422 VALIDATION_ERROR`, `403 EVENT_FULL`, `410 REGISTRATION_CLOSED`, `429 RATE_LIMITED`.

## 6.4 Seguridad de tokens
- `qr_token` y `confirmation_token`: aleatorios + **firma HMAC** con secreto del servidor (incluyen `registrationId` + `eventId`), verificación en backend, expiran tras el evento.
- Nunca confiar en `tenant_id`/`eventId` enviados por cliente para autorización: derivar del recurso + sesión.


## 6.5 Endpoints del Asistente IA (M14)
Los contratos del asistente conversacional (configuración con herencia tenant/evento, gestión y reindexado de la base de conocimiento, chat público, verificación de identidad para acciones sensibles y analítica) se especifican en `12-ASISTENTE-IA.md` (§12.11). Siguen las mismas convenciones de §6.1 y la seguridad de tokens de §6.4. Errores propios: `429 AI_RATE_LIMITED`, `402 AI_QUOTA_EXCEEDED`, `403 VERIFICATION_REQUIRED`.
