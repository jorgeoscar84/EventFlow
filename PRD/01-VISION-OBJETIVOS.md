# 01 — Visión, Objetivos y Métricas

## 1.1 Problema

Organizar eventos (presenciales y digitales) hoy implica usar herramientas dispersas: una para la landing, otra para registro, otra para emails, otra para check-in y nada para sorteos. El resultado: alta tasa de **no-show** (gente que se registra pero no asiste), poca trazabilidad y experiencia de marca fragmentada.

## 1.2 Visión

Una sola plataforma, comercial y elegante, donde un organizador pueda:
- Publicar eventos en una **landing de alta conversión**.
- Capturar registros con confirmación automática.
- Reducir el no-show con **reconfirmación de asistencia** (psicología de escasez/compromiso).
- Hacer **check-in con QR** desde el móvil de varios asesores en simultáneo.
- Medir todo (registrado → confirmado → asistió) y **exportarlo**.
- Cerrar el evento con un **sorteo en vivo tipo show**.

Y donde el dueño de la plataforma (tú) opere como **super-administrador** que habilita empresas/aliados (multi-tenant) que gestionan sus propios eventos de forma aislada.

## 1.3 Objetivos de negocio

| ID | Objetivo | Métrica / KPI | Meta inicial |
|----|----------|---------------|--------------|
| OB-1 | Reducir no-show | (Asistieron / Confirmaron) | ≥ 70% |
| OB-2 | Aumentar conversión de landing | (Registros / Visitas) | ≥ 8% |
| OB-3 | Habilitar modelo SaaS multi-tenant | Nº de empresas activas | Escalable sin redeploy |
| OB-4 | Operación de check-in fluida | Tiempo de escaneo por asistente | < 2s |
| OB-5 | Entregabilidad de correo | Tasa de entrega vía SES | ≥ 98% |

## 1.4 Métricas de producto a instrumentar desde el día 1

- Funnel por evento: `visitas_landing → registros → confirmados → check-in`.
- Tasa de apertura/clic de emails (vía eventos SES / pixel/links rastreables).
- Tiempo medio de check-in y picos de concurrencia.
- Ingresos por evento (si hay pagos) y estado de pago.

## 1.5 Principios de producto (no negociables)

1. **Cero relleno.** Cada pantalla resuelve una tarea real. Nada decorativo sin función.
2. **Mobile-first** en lo público y en el check-in; **desktop-first** en el panel administrativo.
3. **Velocidad percibida.** Estados de carga, optimistic UI y feedback inmediato.
4. **Confianza.** Confirmaciones claras, datos siempre exportables, nada se pierde.
5. **Aislamiento de datos** entre tenants garantizado por diseño (ver `02`).

## 1.6 Fuera de alcance (por ahora)

- App móvil nativa (se usa **PWA** para escaneo y asistentes).
- Streaming de video propio para webinars (se integra con enlace externo: Zoom/Meet/YouTube). La plataforma **gestiona** el evento digital, no hostea el video.
- Marketplace público de eventos de terceros (la landing es por tenant).
