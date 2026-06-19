# 05 — Módulos Funcionales (Especificación + Criterios de Aceptación)

> Formato por módulo: **Objetivo → Comportamiento → Reglas → Criterios de Aceptación (CA)**. Los CA son verificables y sirven de checklist para la IA y el QA.

---

## M1. Autenticación y Multi-Tenant
**Objetivo:** acceso seguro y aislado por tenant + super admin global.
**Comportamiento:** login email/password + magic link + OAuth opcional. Resolución de tenant por subdominio. Invitaciones de equipo por email. Impersonación de soporte por super admin (auditada).
**Reglas:** sesión guarda `user_id`, `tenant_id`, roles/permisos. Middleware inyecta `app.tenant_id` para RLS. Asistentes NO tienen login: operan por **tokens firmados** (confirmación, QR).
**CA-M1:**
- Login y logout funcionan; sesiones expiran y se renuevan.
- Un usuario no puede actuar fuera de su tenant (probado).
- Super admin puede impersonar y queda registrado en `audit_logs`.
- Invitación de equipo crea usuario en estado `invited` y se activa al aceptar.

---

## M2. Panel Super Admin (Plataforma)
**Objetivo:** que tú controles todas las empresas/aliados.
**Comportamiento:** CRUD de tenants, asignar plan/límites, suspender/activar, ver métricas globales (tenants activos, eventos, asistentes, emails enviados), gestionar catálogo de planes, ver logs de auditoría, configurar proveedores por defecto.
**CA-M2:**
- Crear un tenant lo deja operativo sin redeploy (CA-02.2).
- Suspender un tenant bloquea el acceso de sus usuarios y su landing.
- Dashboard global muestra KPIs agregados correctos.

---

## M3. Panel Org Admin — Gestión de Eventos
**Objetivo:** crear y administrar eventos de forma "espectacular, pulida y sin relleno".
**Comportamiento:**
- Wizard de creación de evento: tipo (presencial/digital/híbrido) → datos básicos → ubicación o enlace → entradas/cupos/precio → campos de registro → branding/landing → mensajería → publicar.
- Listado de eventos con estados, filtros, búsqueda, métricas rápidas por tarjeta (registros/confirmados/asistencia).
- Vista de detalle del evento con pestañas: Resumen, Landing, Registros, Mensajería, Check-in, Pagos, Sorteos, Reportes.
- Duplicar evento, archivar, finalizar.
**Reglas:** validación con Zod; no se puede publicar sin campos mínimos; eventos digitales requieren `online_url`; presenciales requieren ubicación.
**CA-M3:**
- Se puede crear un evento presencial y uno digital completos en < 3 min.
- El estado del evento controla su visibilidad pública.
- Los cambios se guardan con feedback claro (toast/optimistic) y son reversibles donde aplique.

---

## M4. Constructor de Landing / Página de Evento
**Objetivo:** páginas de **alta conversión**, modernas, minimalistas y tecnológicas.
**Comportamiento:**
- Landing **principal por tenant**: hero, próximos eventos, eventos destacados, eventos pasados, CTA, branding del tenant.
- Página **por evento**: bloques configurables (`landing_blocks`): hero con countdown, agenda, speakers, galería, sponsors, FAQ, mapa/ubicación, testimonios, CTA de registro fijo (sticky).
- Editor visual con orden drag-and-drop, vista previa en vivo, responsive.
- SEO: metadatos, Open Graph, sitemap; SSG/ISR para velocidad.
**Reglas:** todo bloque es opcional y reordenable; siempre hay CTA de registro visible; carga < 2.5s LCP.
**CA-M4:**
- Reordenar/ocultar bloques se refleja en la página pública.
- La landing pasa Core Web Vitals "good" en móvil.
- El branding del tenant (logo/colores/tipografía) se aplica correctamente.

---

## M5. Registro de Asistentes
**Objetivo:** capturar leads con la menor fricción y máxima confianza.
**Comportamiento:**
- Formulario con campos base (**nombre, email, teléfono**) + campos personalizados del evento (ej. **cédula, provincia**).
- Validación en cliente y servidor (Zod). Anti-spam (honeypot + rate limit + opcional captcha).
- Control de aforo: si lleno → `waitlist` (lista de espera) o cierre de registro según config.
- Si el evento requiere pago → flujo de pago antes de confirmar registro.
- Al registrarse: estado `registered`, se genera `confirmation_token` y `qr_token`, y se **dispara email de confirmación** (M7) con su QR.
**Reglas:** email único por evento; consentimiento de marketing explícito; deduplicación por email.
**CA-M5:**
- Un registro válido crea la fila, envía email de confirmación y muestra pantalla de éxito con QR.
- Registro duplicado (mismo email/evento) se maneja con mensaje claro (no crea duplicado).
- Aforo lleno deriva a lista de espera o muestra "agotado".
- Los campos personalizados se guardan en `registration_field_values`.

---

## M6. Confirmación de Asistencia (Anti No-Show)
**Objetivo:** reducir no-show mediante reconfirmación con sensación de escasez/compromiso.
**Comportamiento:**
- Email de confirmación inicial al registrarse (estado `registered`).
- Campaña automática de **reconfirmación** (ej. 48h/24h antes): correo con texto persuasivo ("confirma tu cupo o lo liberamos") + botón único con `confirmation_token`.
- Al hacer clic → página de confirmación → estado pasa a `confirmed`, se muestra ubicación/enlace y QR. Opcional: añadir a calendario (.ics) y "Cómo llegar".
- Si no confirma antes del `confirmation_deadline_hours`, opción de **liberar cupo** a lista de espera (configurable).
**Reglas:** token de un solo uso lógico (revalidable), expira tras el evento. Mensaje refuerza escasez de forma honesta.
**CA-M6:**
- El enlace de confirmación cambia el estado a `confirmed` y lo registra (`confirmed_at`).
- La página de confirmación muestra ubicación (presencial) o enlace (digital) y el QR.
- Se puede configurar el plazo y la liberación de cupo por evento.

---

## M7. Mensajería y Automatización (ver detalle en `07`)
**Objetivo:** comunicaciones automáticas y manuales, multicanal.
**Comportamiento (resumen):** plantillas (confirmación, recordatorio 24h/1h, reconfirmación, agradecimiento, QR), campañas programadas (absolutas o relativas al evento), envío vía **Amazon SES SMTP**, cola BullMQ, logs de entrega vía webhooks. Estructura lista para **WhatsApp (Twilio/Meta)** y SMS.
**CA-M7:**
- Una campaña "recordatorio 24h antes a confirmados" se encola y envía correctamente.
- Los emails usan el remitente SES verificado del tenant y sus variables se renderizan.
- Estados de entrega (delivered/bounce/open) se reflejan en `message_logs`.

---

## M8. Check-in por QR (PWA móvil)
**Objetivo:** que varios asesores escaneen QR en distintas puertas, rápido y fiable.
**Comportamiento:**
- Cada registro tiene un **QR firmado** (`qr_token`) entregado por email/página de confirmación.
- App de escaneo (PWA, funciona en el navegador del móvil del asesor) usa la cámara.
- Al escanear: valida token → muestra **verde "Acceso OK"** con nombre/datos, o **rojo** si: inválido, duplicado (ya ingresó), no confirmado, o evento equivocado.
- Marca `attended`, `checked_in_at`, `checked_in_by`, `checkin_gate`; registra `attendance_logs`.
- Modo **offline-resiliente**: si se cae la red, cola local y sincroniza al reconectar.
- Dashboard de check-in en vivo (realtime): aforo actual, ritmo de entrada, por puerta.
**Reglas:** QR firmado (HMAC) para que no se falsifique; detectar reentradas; solo asesores asignados al evento (`event_staff`).
**CA-M8:**
- Escanear un QR válido marca `attended` y muestra OK en < 2s.
- Un QR ya usado muestra "duplicado" y no recuenta.
- Un asesor solo puede escanear eventos asignados.
- El contador en vivo sube al escanear (realtime).

---

## M9. Sorteos en Vivo (el "show")
**Objetivo:** cerrar el evento con un sorteo espectacular entre **asistentes reales**.
**Comportamiento:**
- Admin configura: nº de sorteos/ganadores, premios, si el ganador **debe estar presente** (`require_present`), y el filtro de elegibles (por defecto `status = attended`).
- Pantalla de presentación (proyectable): "bombo" animado con números/nombres de asistentes reales girando, **tambores** (audio), tensión creciente y **explosión de confeti** al revelar.
- El presentador ve si el ganador está **presente o no**. Si no está → botón **"Re-sortear"** (queda registrado como `redrawn`) hasta dar con un presente.
- Continuar al siguiente premio. Historial de ganadores visible.
**Reglas:** selección aleatoria con **semilla auditable** (registrada) para transparencia; nadie puede ganar dos veces (configurable); solo elegibles según filtro.
**CA-M9:**
- Solo participan asistentes con check-in (si así se configura).
- La animación corre fluida en pantalla grande (60fps objetivo) con audio y confeti.
- Re-sorteo funciona cuando el ganador no está presente y queda registrado.
- El nº de sorteos/premios es configurable y se respeta.

---

## M10. Reportes y Exportación
**Objetivo:** trazabilidad total y datos exportables.
**Comportamiento:**
- Dashboard por evento: funnel (registrados → confirmados → asistieron → no-show), por puerta, por origen, ingresos/pagos.
- Tabla de registros filtrable (estado, pago, campos personalizados) con búsqueda.
- **Exportar a Excel/CSV**: incluye nombre, email, teléfono, **campos personalizados (cédula, provincia...)**, estado (registrado/confirmado/asistió/no-show), pago (pagó/no pagó), fecha de check-in, puerta, asesor.
- Exportaciones quedan registradas en `audit_logs`.
**CA-M10:**
- La exportación contiene exactamente las columnas y filas filtradas, con estados correctos.
- Los números del funnel cuadran con la base de datos.
- Exportar grandes volúmenes (10k+) no bloquea la UI (job en background si necesario).

---

## M11. Pagos
**Objetivo:** cobrar online y/o llevar control manual de pago.
**Comportamiento:**
- Entradas de pago (`ticket_types` con precio) → checkout Stripe → al pagar, registro `confirmed`/`paid`.
- **Control manual:** admin marca "pagó / no pagó" sin pasarela (efectivo/transferencia).
- Webhooks de Stripe actualizan `payments`. Reembolsos básicos.
- Interfaz de **pasarela genérica** para añadir proveedores locales después.
**CA-M11:**
- Un pago Stripe exitoso marca `paid` y confirma el registro.
- El admin puede marcar pago manual y se refleja en reportes.
- Webhook de Stripe es idempotente (no duplica).

---

## M12. Equipo y Roles
**Objetivo:** colaboración con permisos finos por tenant.
**Comportamiento:** invitar miembros, asignar roles, asignar asesores a eventos/puertas.
**CA-M12:** los permisos se respetan en UI y API (un editor no ve facturación; un asesor solo ve escaneo).

---

## M13. Eventos Digitales (Webinars) — lógica específica
**Objetivo:** que lo digital esté tan pulido como lo presencial.
**Comportamiento:**
- `online_url` (Zoom/Meet/YouTube) se revela solo a **confirmados** y/o X minutos antes (config).
- Recordatorios con el enlace de acceso y countdown.
- "Asistencia" en digital: por clic de acceso al enlace (marca de join) y/o integración futura con el proveedor (webhook de asistencia). Para el sorteo, los asistentes digitales cuentan si abrieron el enlace dentro de la ventana del evento.
- Sala de espera/recordatorio "empieza en X".
**CA-M13:**
- El enlace no se expone públicamente ni a no-confirmados.
- Los recordatorios digitales incluyen el acceso correcto.
- Se registra el "join" como señal de asistencia para reportes y sorteo.

---

## M14. Asistente IA Conversacional (configurable por cuenta/evento)
**Objetivo:** agente LLM que responde a los clientes finales con información personalizada y verificada por evento; configurable y "nutrible" por cuenta y por evento.
**Comportamiento (resumen):** RAG sobre base de conocimiento (auto del evento + FAQ + documentos + URLs) con `pgvector`; configuración con herencia tenant→evento (persona, tono, idioma, tools, modelo); guardarraíles anti-alucinación; tools acotadas (registro, estado con verificación, reenvío de QR, escalado); canal widget web + estructura WhatsApp; analítica y control de coste por plan.
**Especificación completa en `12-ASISTENTE-IA.md`.**
**CA-M14:** ver `12-ASISTENTE-IA.md` (responde solo con contexto aprobado, herencia de config, aislamiento por tenant/evento, datos críticos en vivo, verificación de identidad, proveedor-agnóstico, medición de uso).
