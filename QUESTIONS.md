# QUESTIONS — Preguntas abiertas y supuestos

> Cuando falte un dato no definido en el PRD, se registra aquí con el **supuesto por defecto** adoptado (conservador) hasta confirmación del humano. Regla de `PRD/10-GUIA-EJECUCION-IA.md`.

| ID | Pregunta | Supuesto por defecto adoptado | Estado |
|----|----------|-------------------------------|--------|
| Q-01 | ¿Despliegue de DB: Supabase **cloud** o **self-host**? | Supabase cloud para empezar (free tier); el modelo de datos no cambia si se migra. | Abierta |
| Q-02 | ¿Proveedor/modelo LLM por defecto del asistente? | Capa abstracta lista; proveedor por defecto se fija al implementar Fase 9. BYOK por tenant. | Abierta |
| Q-03 | ¿Nombre comercial definitivo? Placeholder actual: **Eventflow**. | Usar `eventflow` como nombre de paquetes/repos; renombrable luego. | Abierta |
| Q-04 | ¿Estrategia de URL por tenant: subdominio (`{tenant}.dominio`) o ruta (`/{tenant}`)? | Subdominio para branding; en dev se usa ruta `/{tenant}` para simplicidad local. | Abierta |
| Q-05 | ¿Moneda y zona horaria por defecto? | Configurable por tenant/evento; default UTC + USD hasta confirmar (probable: zona local del organizador). | Abierta |
| Q-06 | ¿Pasarela de pago local además de Stripe (ej. para RD/LatAm)? | Solo Stripe en Fase 5; interfaz genérica lista para añadir local después. | Abierta |
| Q-07 | ¿Captcha en registro (hCaptcha/Turnstile)? | Honeypot + rate limit por defecto; captcha activable por evento. | Abierta |

> Acción para el humano: revisar Q-01..Q-07 cuando quieras; el desarrollo avanza con los supuestos sin bloquearse.
