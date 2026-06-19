# PRD — Plataforma de Eventos Multi-Tenant (Presenciales + Digitales)

> Documento maestro de producto e ingeniería. Está diseñado para ser **ejecutado por una IA (o equipo multiagente)** con mínima ambigüedad. Cada módulo incluye objetivo, alcance, criterios de aceptación y contratos de datos/API.

**Nombre en clave del proyecto:** `Eventflow` (placeholder, renombrable).
**Versión del PRD:** 1.0
**Idioma del producto:** Español (i18n preparado para multi-idioma).

---

## Cómo usar este PRD

1. Lee primero `10-GUIA-EJECUCION-IA.md`. Define el **protocolo de trabajo multiagente**, las reglas anti-alucinación y los *gates* de calidad. Es de lectura **obligatoria** antes de escribir código.
2. Construye en el orden de fases definido en `11-ROADMAP.md`. No saltes fases.
3. Cada vez que termines una unidad de trabajo, valida contra los **Criterios de Aceptación (CA)** del módulo correspondiente.
4. Toda decisión técnica nueva debe quedar registrada en `DECISIONS.md` (ADR ligero).

---

## Índice de documentos

| Doc | Contenido |
|-----|-----------|
| `00-INDICE.md` | Este archivo: visión general e índice. |
| `01-VISION-OBJETIVOS.md` | Problema, visión, objetivos medibles, métricas de éxito. |
| `02-ROLES-MULTITENANCY.md` | Personas, roles, permisos y arquitectura multi-tenant. |
| `03-STACK-TECNOLOGICO.md` | Stack, versiones, justificación y decisión de base de datos. |
| `04-MODELO-DE-DATOS.md` | Esquema relacional completo (tablas, campos, relaciones, índices). |
| `05-MODULOS-FUNCIONALES.md` | Especificación funcional detallada de cada módulo + CA. |
| `06-API-CONTRATOS.md` | Endpoints, payloads, respuestas y errores. |
| `07-MENSAJERIA-AUTOMATIZACION.md` | Motor de email (Amazon SES), recordatorios, WhatsApp/Twilio. |
| `08-UX-UI-DESIGN-SYSTEM.md` | Sistema de diseño, flujos, landing de alta conversión, animaciones del sorteo. |
| `09-SEGURIDAD-NO-FUNCIONALES.md` | Seguridad, privacidad, rendimiento, escalabilidad, observabilidad. |
| `10-GUIA-EJECUCION-IA.md` | Protocolo multiagente, anti-alucinación, QA gates, Definition of Done. |
| `11-ROADMAP.md` | Fases, entregables y secuencia de construcción. |
| `12-ASISTENTE-IA.md` | Asistente conversacional LLM configurable por cuenta/evento (RAG, guardarraíles, tools). |
| `13-CAMBIOS-IMPLEMENTACION.md` | **Mejoras y decisiones adoptadas en la construcción real** (visual premium, routing público, scheduler DB-polling, branding, IA con embeddings locales) + estado por fase. |

---

## Resumen de una línea

Plataforma SaaS multi-tenant para crear, promocionar, gestionar y medir **eventos presenciales y digitales**, con registro inteligente, confirmación de asistencia anti-no-show, check-in por QR, mensajería automatizada (Amazon SES + estructura para WhatsApp), pagos, reportes exportables, un **módulo de sorteos en vivo** estilo show y un **asistente IA conversacional** configurable por cuenta y por evento que responde a los clientes finales con información verificada (RAG).
