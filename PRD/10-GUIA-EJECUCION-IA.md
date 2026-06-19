# 10 — Guía de Ejecución para IA (Protocolo Multiagente, Anti-Alucinación y QA)

> **Lectura obligatoria antes de escribir cualquier código.** Este documento define CÓMO debe trabajar la IA (o el equipo de agentes) para entregar la aplicación con calidad y sin alucinaciones.

## 10.1 Reglas de oro (anti-alucinación)
1. **No inventes.** Si un dato, API, versión o decisión no está en el PRD, NO lo asumas: regístralo como **pregunta abierta** en `QUESTIONS.md` y elige el comportamiento por defecto más conservador documentándolo.
2. **Verifica versiones reales.** Antes de fijar versiones de dependencias, comprueba la última estable/LTS real y anótala en `DECISIONS.md`. No uses números de versión "de memoria".
3. **No uses APIs que no existan.** Si dudas de la firma de una librería, consúltala en su documentación antes de usarla. Prohibido inventar métodos.
4. **El esquema de datos manda.** Toda funcionalidad se ajusta al modelo de `04`. Si necesitas un campo nuevo, primero actualiza `04` + migración, luego el código.
5. **Contratos primero.** Implementa según los contratos de `06`. Si cambias un contrato, actualiza el doc y los consumidores en el mismo cambio.
6. **Pequeños incrementos verificables.** Cada PR/tarea debe compilar, pasar lint y tests, y cumplir los CA del módulo.
7. **Nada de TODO silencioso.** Si dejas algo incompleto, márcalo explícitamente y repórtalo.
8. **Cita la fuente** cuando tomes una decisión basada en documentación externa (link en `DECISIONS.md`).

## 10.2 Documentos de trabajo que la IA debe mantener
- `DECISIONS.md` — ADR ligero: decisión, motivo, alternativas, fecha. (Versiones reales, cloud vs self-host, etc.)
- `QUESTIONS.md` — preguntas abiertas / supuestos hechos.
- `PROGRESS.md` — estado por fase/módulo con checklist de CA.
- `CHANGELOG.md` — cambios relevantes.

## 10.3 Roles de agentes (equipo multiagente)
Si se ejecuta con varios agentes, usar estos roles. Si es un solo agente, recorrer los roles secuencialmente por tarea.

| Agente | Responsabilidad | Entrada | Salida |
|--------|-----------------|---------|--------|
| **Orquestador/PM** | Descompone el roadmap en tareas, ordena, asigna, controla *gates*. | PRD | backlog de tareas con CA |
| **Arquitecto** | Decisiones técnicas, esqueleto del repo, contratos, migraciones. | tarea | estructura + ADR |
| **Backend Dev** | API, servicios de dominio, jobs, integraciones. | contrato + schema | endpoints + tests |
| **Frontend Dev** | UI, design system, flujos, landing, PWA, sorteo. | diseño + contrato | componentes + tests |
| **DB/Datos** | Esquema, migraciones, RLS, índices, seeds. | `04` | migraciones + seed |
| **QA/Test** | Tests unit/integración/E2E, valida CA, regresión. | módulo | reporte de QA |
| **Revisor/Seguridad** | Revisa código, seguridad, multi-tenant, secretos. | PR | aprobación o cambios |
| **DevOps** | Docker, CI/CD, entornos, observabilidad. | repo | pipelines + infra |

## 10.4 Flujo por tarea (obligatorio)
```
1. PLAN     → el agente escribe qué hará, qué archivos toca y qué CA cubre.
2. BUILD    → implementa en incremento pequeño.
3. SELF-CHECK → typecheck + lint + tests locales; revisa contra CA.
4. TEST     → QA agrega/corre tests (unit/integración/E2E según aplique).
5. REVIEW   → Revisor valida seguridad, multi-tenant, contratos, calidad.
6. GATE     → solo si pasa, se marca el módulo como DONE en PROGRESS.md.
```
Ningún paso se salta. Un módulo no está "hecho" hasta pasar el **GATE**.

## 10.5 Definition of Done (DoD) por módulo
Un módulo está DONE solo si:
- [ ] Cumple **todos** sus Criterios de Aceptación (CA-Mx).
- [ ] `typecheck`, `lint`, `format` sin errores.
- [ ] Tests: unit de lógica de dominio + al menos un E2E del flujo principal.
- [ ] Respeta contratos de `06` y esquema de `04`.
- [ ] Sin secretos en el código; variables en `.env.example` actualizado.
- [ ] Multi-tenant verificado (no fuga entre tenants).
- [ ] Accesibilidad básica (AA) en pantallas nuevas.
- [ ] `PROGRESS.md` y `DECISIONS.md` actualizados.

## 10.6 Gates de calidad globales (al cerrar cada fase)
- **Gate Seguridad:** tests de aislamiento multi-tenant + escaneo de secretos + verificación de webhooks.
- **Gate Rendimiento:** Core Web Vitals de landing + p95 de API + tiempo de check-in.
- **Gate UX:** revisión de los flujos clave contra `08` (sin relleno, una acción primaria por pantalla).
- **Gate Datos:** migraciones reversibles + seeds + backup/restore probado.

## 10.7 Estándares de código
- TypeScript `strict: true`. Sin `any` salvo justificado.
- Validación con Zod en bordes (API, formularios, env con `zod`/`t3-env`).
- Lógica de dominio en `packages/core` (testeable, sin acoplar a framework).
- Nombres claros, funciones pequeñas, comentarios solo donde aportan.
- Commits convencionales (`feat:`, `fix:`, `chore:`...). PRs pequeños.
- Errores tipados y manejados; nada de promesas sin `await`/catch.

## 10.8 Estrategia de pruebas
- **Unit (Vitest):** servicios de dominio (funnel de estados, selección de sorteo, planificación de campañas, firma de tokens).
- **Integración:** endpoints de `06` contra DB de test (con RLS activo).
- **E2E (Playwright):** registro → confirmación → check-in (QR simulado) → sorteo → export; flujo de creación de evento; flujo super admin crea tenant.
- **Casos límite obligatorios:** registro duplicado, aforo lleno/lista de espera, QR inválido/duplicado, ganador no presente (re-sorteo), bounce de email, webhook duplicado (idempotencia), zona horaria de recordatorios.

## 10.9 Cómo empezar (orden estricto para la IA)
1. Leer todo el PRD. Crear `DECISIONS.md`, `QUESTIONS.md`, `PROGRESS.md`.
2. Confirmar versiones reales y decisión DB (cloud Supabase vs self-host).
3. Scaffolding del monorepo (`03`) + CI + Docker + `.env.example`.
4. Esquema de DB + migraciones + RLS + seeds (`04`).
5. Auth + multi-tenant (M1, M2) con tests de aislamiento.
6. Seguir el **Roadmap** (`11`) fase por fase, aplicando 10.4–10.6 en cada módulo.
7. Reportar al final de cada fase: qué se hizo, CA cumplidos, riesgos y preguntas abiertas.

## 10.10 Formato de reporte de avance (al humano)
Cada fase entrega:
- Resumen de lo construido y demo/cómo probarlo.
- Checklist de CA (✔/✗ con evidencia: test, captura, log).
- Decisiones tomadas (`DECISIONS.md`) y preguntas abiertas (`QUESTIONS.md`).
- Riesgos y siguiente paso propuesto.
