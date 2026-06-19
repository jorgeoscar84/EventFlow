# 04 — Modelo de Datos (Esquema)

> SGBD: PostgreSQL. IDs: `uuid` (v7 si disponible, si no v4). Timestamps `created_at`, `updated_at` en toda tabla. Borrado lógico (`deleted_at`) donde aplique. Todas las tablas de negocio llevan `tenant_id` salvo las marcadas como **GLOBAL**.

## 4.1 Diagrama de relaciones (texto)

```
tenants (GLOBAL para superadmin) 1─┐
                                   ├─< users >─ user_roles >─ roles >─ role_permissions >─ permissions
                                   ├─< events 1─< event_translations
                                   │        1─< ticket_types
                                   │        1─< custom_fields
                                   │        1─< event_staff >─ users
                                   │        1─< landing_blocks
                                   │        1─< registrations 1─< registration_field_values
                                   │                          1─< attendance_logs (check-ins)
                                   │                          1─< payments
                                   │        1─< message_campaigns 1─< message_jobs >─ message_logs
                                   │        1─< raffles 1─< raffle_rounds >─ raffle_winners
                                   └─< plans (GLOBAL) / branding / smtp_settings / integrations
```

## 4.2 Tablas globales (plataforma / superadmin)

### `plans` (GLOBAL)
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| name | text | Free, Pro, Business... |
| limits | jsonb | `{ activeEvents, attendeesPerMonth, teamMembers, emailsPerMonth, customDomain, modules:["raffle","payments","whatsapp"] }` |
| price_cents | int | |
| interval | enum(month, year) | |
| is_active | bool | |

### `tenants` (GLOBAL)
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| name | text | nombre de la empresa/aliado |
| slug | text unique | subdominio |
| plan_id | uuid FK plans | |
| status | enum(active, suspended, trial) | |
| custom_domain | text null | fase posterior |
| created_by | uuid (superadmin) | |

### `tenant_usage` (GLOBAL)
Contadores mensuales por tenant: `events_count`, `attendees_count`, `emails_sent`, periodo. Para enforcement de límites del plan.

### `audit_logs` (GLOBAL)
`actor_id`, `tenant_id` (null si superadmin global), `action`, `target_type`, `target_id`, `metadata jsonb`, `ip`, `created_at`. Para impersonación, exportaciones y acciones sensibles.

## 4.3 Identidad y acceso

### `users`
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | null solo para superadmin global |
| email | citext unique-per-tenant | |
| name | text | |
| phone | text null | |
| password_hash | text null | si no se usa OAuth/magic link |
| is_super_admin | bool default false | |
| status | enum(active, invited, disabled) | |
| last_login_at | timestamptz | |

### `roles`
`id, tenant_id (null=rol de sistema), name, description, is_system`.

### `permissions` (GLOBAL catálogo)
`id, key (event:create...), description`.

### `role_permissions`
`role_id, permission_id`.

### `user_roles`
`user_id, role_id`.

## 4.4 Eventos

### `events`
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| slug | text | único por tenant; URL pública |
| title | text | |
| description | text/richtext | |
| type | enum(in_person, digital, hybrid) | **presencial / digital / híbrido** |
| status | enum(draft, published, archived, finished) | |
| visibility | enum(public, private, unlisted) | private = solo por enlace |
| starts_at | timestamptz | |
| ends_at | timestamptz | |
| timezone | text | |
| cover_image_url | text | |
| capacity | int null | aforo; null = ilimitado |
| location_name | text null | presencial |
| location_address | text null | |
| location_lat / location_lng | numeric null | mapa |
| online_url | text null | digital: enlace Zoom/Meet/YouTube (se revela según reglas) |
| online_provider | enum(zoom, meet, youtube, custom) null | |
| requires_payment | bool default false | |
| requires_confirmation | bool default true | reconfirmación anti no-show |
| confirmation_deadline_hours | int | horas antes del evento para reconfirmar |
| settings | jsonb | flags varios (mostrar aforo, lista de espera, etc.) |
| published_at | timestamptz | |

### `event_translations` (i18n)
`event_id, locale, title, description`.

### `custom_fields` (campos de registro configurables por evento)
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| event_id | uuid FK | |
| key | text | ej. `cedula`, `provincia`, `empresa` |
| label | text | |
| type | enum(text, number, select, checkbox, date, document_id) | |
| options | jsonb null | para select |
| required | bool | |
| order | int | |

> Campos base SIEMPRE presentes en `registrations`: **nombre, email, teléfono**. Los adicionales (cédula, provincia, etc.) viven como `custom_fields` + `registration_field_values`.

### `ticket_types` (entradas / cupos / precio)
`id, event_id, name, price_cents, currency, quantity_total, quantity_sold, is_free, sales_start, sales_end`.

### `event_staff` (asesores asignados a un evento para check-in)
`id, event_id, user_id, gate_label` (ej. "Puerta A").

### `landing_blocks` (constructor visual de la página del evento)
`id, event_id, type (hero, agenda, speakers, gallery, faq, sponsors, cta, countdown, map, testimonials), order, content jsonb, is_visible`.

## 4.5 Registros y asistencia

### `registrations`
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK | |
| event_id | uuid FK | |
| ticket_type_id | uuid FK null | |
| full_name | text | base |
| email | citext | base |
| phone | text | base |
| status | enum(registered, confirmed, waitlist, cancelled, attended, no_show) | **estado del funnel** |
| confirmation_token | text unique | enlace de reconfirmación |
| qr_token | text unique | contenido del QR (firmado) |
| confirmed_at | timestamptz null | |
| checked_in_at | timestamptz null | |
| checked_in_by | uuid null FK users | qué asesor lo escaneó |
| checkin_gate | text null | qué puerta |
| source | text null | utm/origen |
| consent_marketing | bool | RGPD/consentimiento |
| created_at | timestamptz | |

Índices: `(event_id, status)`, `unique(event_id, email)`, `qr_token`, `confirmation_token`.

> **Estados del funnel (clave para reportes):**
> `registered` → (reconfirma) `confirmed` → (escaneo QR) `attended`. Si no asiste tras el evento → `no_show`. `waitlist` si supera aforo. `cancelled` si se da de baja.

### `registration_field_values`
`id, registration_id, custom_field_id, value` (valor del campo personalizado: cédula, provincia, etc.).

### `attendance_logs` (auditoría de check-ins; soporta re-entradas)
`id, registration_id, event_id, scanned_by, gate, result enum(ok, duplicate, invalid, not_confirmed), scanned_at`.

> Permite trazar **quién escaneó, cuándo y en qué puerta**, y detectar duplicados/QR inválidos.

## 4.6 Pagos

### `payments`
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id, event_id, registration_id | uuid FK | |
| amount_cents | int | |
| currency | text | |
| provider | enum(stripe, manual, other) | |
| provider_ref | text null | id de la pasarela |
| status | enum(pending, paid, failed, refunded, manual_paid) | **control pagó / no pagó** |
| paid_at | timestamptz null | |
| notes | text null | para pagos manuales |

> Soporta tanto cobro online (Stripe) como **control manual** (marcar "pagó/no pagó" sin pasarela), tal como pediste.

## 4.7 Mensajería y automatización

### `smtp_settings` (por tenant)
`tenant_id, from_name, from_email, ses_region, smtp_host, smtp_port, smtp_user, smtp_pass (cifrado), verified bool`.

### `integrations` (por tenant)
`tenant_id, type (whatsapp_twilio, whatsapp_meta, webhook, zapier), config jsonb (cifrado), is_active`.

### `message_templates` (por tenant/evento)
`id, tenant_id, event_id null, channel enum(email, whatsapp, sms), key (confirmation, reminder_24h, reminder_1h, reconfirm, ticket_qr, thank_you, custom), subject, body (MJML/React Email/markdown con variables {{name}}, {{event_title}}, {{location}}, {{confirm_url}}, {{qr_url}})`.

### `message_campaigns` (planificación)
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id, event_id | uuid FK | |
| name | text | |
| channel | enum(email, whatsapp, sms) | |
| template_key | text | |
| trigger_type | enum(scheduled_absolute, relative_to_event, on_event) | |
| scheduled_at | timestamptz null | absoluto |
| offset_minutes | int null | relativo (ej. -1440 = 24h antes; -60 = 1h antes) |
| audience_filter | jsonb | ej. `{ status: ["confirmed"] }` o `{ status:["registered"] }` |
| status | enum(draft, scheduled, running, sent, cancelled) | |

### `message_jobs` (unidad encolada en BullMQ)
`id, campaign_id, registration_id, channel, scheduled_for, status enum(queued, sent, failed, skipped), attempts, last_error`.

### `message_logs`
`id, registration_id, campaign_id null, channel, template_key, provider_message_id, status enum(sent, delivered, opened, clicked, bounced, complaint, failed), event_payload jsonb, created_at`. Alimentado por **webhooks de SES** (SNS) y de Twilio.

## 4.8 Sorteos

### `raffles`
| campo | tipo | notas |
|-------|------|-------|
| id | uuid PK | |
| tenant_id, event_id | uuid FK | |
| name | text | |
| eligible_filter | jsonb | quién entra: por defecto `{ status:"attended" }` (asistentes reales) |
| require_present | bool default true | el ganador debe estar presente para validar |
| total_winners | int | nº de premios/sorteos a realizar |
| status | enum(configured, running, finished) | |
| prizes | jsonb | lista de premios por posición |

### `raffle_rounds`
`id, raffle_id, round_number, prize, status enum(pending, drawing, won, redrawn)`.

### `raffle_winners`
`id, raffle_round_id, registration_id, was_present bool, accepted bool, drawn_at`.

> Lógica: el sistema selecciona un participante elegible al azar (semilla auditable). En pantalla se anima el "bombo". Si `require_present` y el ganador no está presente (no tiene check-in o el presentador marca ausente), se **re-sortea** (`redrawn`) hasta encontrar un presente. Todo queda registrado para transparencia.

## 4.9 Almacenamiento de archivos
- Imágenes de portada, galería, logos, QR renderizados (si se cachean), exportaciones: **Supabase Storage** (o MinIO si self-host). Rutas namespaced por `tenant_id/event_id/...`.

## 4.10 Índices y rendimiento (mínimos)
- `registrations (tenant_id, event_id, status)`, `unique(event_id, email)`, `qr_token`, `confirmation_token`.
- `events (tenant_id, status, starts_at)`.
- `message_jobs (status, scheduled_for)` para el worker.
- `attendance_logs (event_id, scanned_at)`.

## 4.11 RLS (Row-Level Security)
Habilitar RLS en todas las tablas con `tenant_id`. Política base: `tenant_id = current_setting('app.tenant_id')::uuid`. El service role (worker/superadmin) usa bypass controlado y auditado. Esto es la **red de seguridad** del aislamiento multi-tenant descrito en `02`.


## 4.12 Tablas del Asistente IA (M14)
Las tablas del asistente conversacional —`ai_agent_configs`, `ai_knowledge_sources`, `ai_knowledge_chunks` (con `pgvector`), `ai_conversations`, `ai_messages`, `ai_usage`— se especifican en `12-ASISTENTE-IA.md` (§12.9). Todas llevan `tenant_id` (y `event_id` cuando aplica), con RLS y filtrado obligatorio por tenant/evento en la búsqueda semántica. Habilitar la extensión `pgvector` en Postgres e índice `hnsw`/`ivfflat` sobre `ai_knowledge_chunks.embedding`.
