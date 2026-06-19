# 02 — Roles, Permisos y Arquitectura Multi-Tenant

## 2.1 Personas / Roles

| Rol | Quién es | Qué hace |
|-----|----------|----------|
| **Super Admin** (tú / plataforma) | Dueño del SaaS | Crea/suspende **tenants** (empresas), gestiona planes/límites, ve métricas globales, impersona soporte, configura proveedores globales por defecto. |
| **Org Admin** (empresa/aliado) | Cliente del SaaS | Gestiona su empresa: equipo, branding, eventos, mensajería, pagos, reportes. Aislado del resto de tenants. |
| **Org Manager / Editor** | Staff de la empresa | Crea y edita eventos, ve reportes. Sin acceso a facturación/configuración sensible. |
| **Staff / Asesor (check-in)** | Personal en puerta | Solo acceso a la PWA de escaneo de QR del/los eventos asignados. |
| **Sorteador / Presentador** | Quien corre el sorteo | Acceso a la pantalla de sorteo en vivo y su control. |
| **Asistente / Lead** | Público final | Se registra, confirma asistencia, recibe QR. No tiene cuenta tradicional (acceso por enlace con token). |

> Roles configurables por tenant con un sistema **RBAC** (rol → permisos). Los permisos se definen por recurso y acción (ej. `event:create`, `report:export`, `checkin:scan`).

## 2.2 Modelo de permisos (RBAC)

- Tabla `roles` (por tenant + roles del sistema) y `permissions`.
- Cada usuario pertenece a **un tenant** (excepto Super Admin, que es global) y tiene uno o más roles.
- Asesores pueden estar **restringidos a eventos específicos** (tabla `event_staff`).

Permisos base (lista no exhaustiva, ampliable):
```
tenant:manage, team:manage, billing:manage,
event:create, event:edit, event:publish, event:delete,
landing:edit, registration:view, registration:export,
messaging:configure, messaging:send, campaign:schedule,
checkin:scan, raffle:run, payment:view, payment:manage,
report:view, report:export
```

## 2.3 Arquitectura Multi-Tenant

**Estrategia elegida: Base de datos compartida con aislamiento por `tenant_id` (shared schema + row-level isolation).**

Justificación:
- Más barato y simple de operar al inicio (un solo backup, una sola migración).
- Escala a cientos de tenants sin coste por tenant.
- El aislamiento se fuerza en **dos capas**: (a) middleware de aplicación que inyecta y valida `tenant_id` en cada query; (b) **Row-Level Security (RLS)** a nivel de base de datos como red de seguridad.

Reglas:
1. **Toda tabla de negocio** (excepto tablas globales del sistema) incluye `tenant_id NOT NULL` indexado.
2. Ningún query de aplicación accede a datos sin `tenant_id` resuelto desde el contexto de sesión.
3. El Super Admin opera en un **contexto especial** que puede listar/filtrar por tenant explícitamente (auditado).
4. Subdominios o rutas por tenant: `https://{tenant}.eventflow.app` o `https://eventflow.app/{tenant}` (decidir en `08`; recomendado subdominio para branding). Dominios personalizados en fase posterior.

**Camino de evolución:** si un tenant grande lo exige, se puede migrar a *schema por tenant* o *DB dedicada* sin cambiar el modelo de dominio (los `tenant_id` ya están).

## 2.4 Branding por tenant

Cada tenant configura: logo, colores primarios/secundarios, tipografía, dominio, remitente de correo (SES verificado), redes sociales y textos legales. Esto alimenta tanto la landing pública como las plantillas de email.

## 2.5 Planes y límites (estructura para monetización)

Tabla `plans` (definida por Super Admin): límites de eventos activos, asistentes/mes, miembros de equipo, envíos de email/mes, dominios personalizados, módulos habilitados (sorteo, pagos, WhatsApp). `tenant.plan_id` + contadores de uso. Esto deja lista la facturación SaaS aunque al inicio lo uses solo tú.

### Criterios de Aceptación (CA-02)
- CA-02.1: Un usuario de Tenant A **nunca** puede leer/escribir datos de Tenant B (probado con tests de RLS y de API).
- CA-02.2: Super Admin puede crear un tenant nuevo y este queda operativo **sin redeploy**.
- CA-02.3: Cambiar el branding de un tenant se refleja en su landing y en sus emails.
- CA-02.4: Un asesor solo ve y escanea los eventos a los que está asignado.
