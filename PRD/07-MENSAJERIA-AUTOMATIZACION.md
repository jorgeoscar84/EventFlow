# 07 — Mensajería y Motor de Automatización

> Requisito del cliente: usar **Amazon SES vía SMTP**. Dejar **estructura** para WhatsApp (Twilio/Meta) y SMS. Las comunicaciones deben ser fiables, programables y medibles.

## 7.1 Arquitectura del motor

```
[Trigger]  (registro / cron / acción admin)
   → crea/activa  message_campaigns
   → el planificador genera  message_jobs  por destinatario (según audience_filter)
   → encola en  BullMQ (Redis)  con  delay/scheduled_for
   → el  worker  consume, renderiza plantilla, envía por canal
        ├─ email  → Amazon SES (SMTP, Nodemailer)
        ├─ whatsapp → Twilio/Meta (provider abstracto)  [estructura]
        └─ sms → Twilio  [estructura]
   → escribe  message_logs (sent)
   → webhooks (SES/SNS, Twilio) actualizan estado (delivered/open/click/bounce)
```

## 7.2 Proveedor de canal (abstracción)
Interfaz común para no acoplarse a un proveedor:
```ts
interface ChannelProvider {
  send(input: { to: string; templateKey: string; variables: Record<string,unknown>; tenantId: string; }): Promise<{ providerMessageId: string }>;
}
// Implementaciones: SesEmailProvider, TwilioWhatsappProvider, TwilioSmsProvider, MetaWhatsappProvider
```
El `WHATSAPP_PROVIDER` (env / `integrations`) decide la implementación. **Email se implementa ya; WhatsApp/SMS quedan como providers con stub + configuración lista.**

## 7.3 Email con Amazon SES (SMTP)
- Transport: **Nodemailer** con `SES_SMTP_HOST/PORT/USER/PASS`.
- Remitente: el verificado del tenant (`smtp_settings.from_email`), con fallback al global.
- Requisitos de entregabilidad: verificar dominio, **SPF + DKIM + DMARC**, salir del **sandbox de SES**, configurar **SNS** para bounces/complaints (obligatorio para reputación).
- Plantillas con **React Email** (o MJML) → HTML responsive + versión texto. Variables: `{{name}}`, `{{event_title}}`, `{{event_date}}`, `{{location}}`, `{{online_url}}`, `{{confirm_url}}`, `{{qr_url}}`, `{{add_to_calendar_url}}`.

## 7.4 Catálogo de mensajes (plantillas base)
| key | Cuándo | Audiencia | Contenido clave |
|-----|--------|-----------|-----------------|
| `confirmation` | Al registrarse | nuevo `registered` | "Te registraste", datos del evento, **QR adjunto/enlace**, botón confirmar |
| `reconfirm` | 48h/24h antes (config) | `registered` | Persuasivo, escasez honesta, **botón confirmar asistencia** |
| `reminder_24h` | 24h antes | `confirmed` | Recordatorio, ubicación/enlace, cómo llegar, QR |
| `reminder_1h` | 1h antes | `confirmed` | "Empieza pronto", acceso directo/enlace |
| `ticket_qr` | Tras confirmar | `confirmed` | Pase con QR para presencial |
| `digital_access` | X min antes (digital) | `confirmed` | Enlace de acceso al webinar |
| `thank_you` | Post-evento | `attended` | Gracias + (encuesta/replay/próximos eventos) |
| `waitlist_promoted` | Si se libera cupo | `waitlist` | "Tienes cupo, confirma" |

> Todas editables por tenant/evento. Soportan multi-idioma.

## 7.5 Tipos de disparo (trigger_type)
- `scheduled_absolute`: fecha/hora fija (`scheduled_at`).
- `relative_to_event`: offset respecto a `starts_at` (`offset_minutes`, ej. -2880=48h, -1440=24h, -60=1h).
- `on_event`: por acontecimiento (registro, confirmación, check-in, pago).

## 7.6 Planificación y fiabilidad
- El planificador corre por cron (cada minuto) y/o al crear campaña; calcula destinatarios con `audience_filter` y crea `message_jobs` con `scheduled_for`.
- BullMQ con **reintentos exponenciales**, *dead-letter* y *rate limiting* (respetar límites de envío de SES por segundo).
- **Idempotencia:** un `(campaign_id, registration_id)` no se envía dos veces (constraint único en `message_jobs`).
- Respeta **zona horaria del evento** para los offsets.
- Respeta consentimiento (`consent_marketing`) y enlaces de **baja** (unsubscribe) donde aplique legalmente.

## 7.7 Webhooks de estado
- **SES → SNS → `/api/v1/webhooks/ses`**: delivery, bounce, complaint. (Open/click vía configuración de SES o tracking propio de enlaces.)
- **Twilio → `/api/v1/webhooks/twilio`**: estados de WhatsApp/SMS.
- Actualizan `message_logs.status` para alimentar métricas de M10.

## 7.8 WhatsApp / Externos (estructura, fase posterior)
- `integrations` guarda credenciales cifradas por tenant.
- Provider `TwilioWhatsappProvider` (plantillas aprobadas/HSM) y `MetaWhatsappProvider` como opciones.
- Mismos triggers y plantillas (campo `channel`). Webhook genérico salida para Zapier/Make si se quiere.

### Criterios de Aceptación (CA-07)
- CA-07.1: Envío real por SES SMTP con dominio verificado y DKIM.
- CA-07.2: Campaña "reconfirmar 24h antes a registrados" se planifica y entrega sin duplicados.
- CA-07.3: Bounces/complaints de SES se registran y se suprime el reenvío a esa dirección.
- CA-07.4: El sistema de providers permite activar WhatsApp solo configurando credenciales (sin tocar el core).


---

> **Actualización de implementación (ver `13`):** el procesamiento se realiza con un **scheduler por sondeo de base de datos** (cada 60s materializa campañas y procesa envíos vencidos) en `apps/worker`, en lugar de BullMQ/Redis, para reducir infraestructura y coste. El envío por SES es best-effort. BullMQ/Redis queda como opción para alta escala.
