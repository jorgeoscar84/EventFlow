# AGENTS.md — Protocolo de trabajo para IAs en Eventflow

> Este archivo define **cómo debe trabajar cualquier agente de IA** en este repositorio.
> Es de lectura **obligatoria** antes de escribir código. Está alineado con `PRD/10-GUIA-EJECUCION-IA.md`.

---

## 1. Antes de hacer cualquier cosa

1. Lee `CONTEXT.md` — arquitectura, estructura y convenciones.
2. Revisa `PROGRESS.md` — estado actual de cada módulo.
3. Revisa `DECISIONS.md` — decisiones técnicas ya tomadas (no las re-debates sin motivo).
4. Si el cambio afecta el modelo de datos, lee `PRD/04-MODELO-DE-DATOS.md`.

---

## 2. Reglas anti-alucinación (OBLIGATORIAS)

1. **No inventes.** Si no estás seguro de una API, firma de función o comportamiento, busca el código real. Nunca supongas.
2. **El esquema de datos manda.** Prisma es la fuente de verdad. Antes de usar un campo, verifica que existe en `packages/db/prisma/schema.prisma`.
3. **Verifica imports antes de usarlos.** Todos los servicios se exportan desde `packages/db/src/index.ts`. Si no está ahí, no existe.
4. **No cambies contratos de API** sin actualizar todos los consumidores en el mismo cambio.
5. **Documenta lo que no terminas.** Si dejas algo incompleto, dilo explícitamente con un comentario `// TODO:`.

---

## 3. Arquitectura que DEBES respetar

### Capas (de arriba a abajo, NO al revés)

```
apps/web/src/app/         → rutas, páginas, server actions
apps/web/src/lib/         → auth, api helpers, supabase, stripe, email
packages/db/src/services/ → lógica de dominio (los servicios reales)
packages/db/prisma/       → schema + migraciones
packages/core/src/        → lógica pura (sin Prisma ni Next)
```

- Las **páginas** importan de `lib/` y de `@eventflow/db`
- Los **servicios** (`packages/db/services/`) importan de Prisma y de `@eventflow/core`
- **Nunca** metas lógica de negocio en las páginas/rutas
- **Nunca** importes Next.js desde `packages/db` o `packages/core`

### Multi-tenancy — regla de oro

```typescript
// SIEMPRE filtrar por tenantId. Sin excepción.
await prisma.event.findFirst({
  where: { id, tenantId: user.tenantId }  // ← obligatorio
});
```

Si ves un query sin `tenantId`, es un bug de seguridad.

---

## 4. Patrones de código

### API Route Handler
```typescript
// apps/web/src/app/api/v1/.../route.ts
import { requirePermission } from '@/lib/auth';
import { ok, fail, handle } from '@/lib/api';

export async function POST(req: Request) {
  return handle(async () => {
    const user = await requirePermission('event:create');  // lanza AuthError si falla
    if (!user.tenantId) return fail(403, 'NO_TENANT', 'Sin tenant');
    const data = mySchema.parse(await req.json());         // Zod valida el input
    const result = await myService(user.tenantId, data);   // servicio en packages/db
    return ok(result, { status: 201 });
  });
}
```

### Server Action
```typescript
// 'use server' en la primera línea, siempre
'use server';
export async function myAction(_prev: State, formData: FormData): Promise<State> {
  const user = await getCurrentUser();
  if (!user?.tenantId) return { error: 'No autorizado.' };
  if (!user.isSuperAdmin && !user.permissions.includes('event:edit')) {
    return { error: 'Sin permiso.' };
  }
  // lógica aquí
  revalidatePath('/dashboard/events');
  redirect('/dashboard/events');  // o return { ok: true, error: null }
}
```

### Servicio en packages/db
```typescript
// packages/db/src/services/my-service.ts
export async function doSomething(tenantId: string, input: Input) {
  // SIEMPRE verificar pertenencia al tenant
  const resource = await prisma.resource.findFirst({
    where: { id: input.id, tenantId }  // ← tenantId siempre
  });
  if (!resource) return null;  // no lanzar 404 desde aquí, dejar al handler
  // ...
}
```

---

## 5. Estilos y componentes

### Design system (SIEMPRE usar, no inventar)
```typescript
import { cn } from '@eventflow/ui';           // merge de clases
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Card, Badge } from '@/components/ui/card';
import { PageHeader } from '@/components/app-shell';
import { Reveal, Stagger, StaggerItem } from '@/components/visual/reveal';
import { Countdown } from '@/components/visual/countdown';
```

### Paleta (variables CSS, no valores hardcoded)
```
Fondo oscuro:   bg-ink-950 / bg-ink-900 / bg-ink-800
Marca:          brand-400 / brand-500 / brand-600
Acento fuchsia: accent-400 / accent-500
Texto muted:    text-white/60 / text-white/40
Bordes:         border-white/10 / border-white/15
```

### Tipografía
```html
<!-- Display / titulares -->
<h1 className="font-display text-5xl">Título</h1>
<!-- Eyebrow / etiquetas -->
<span className="eyebrow">ETIQUETA</span>
```

### Animaciones (Framer Motion — con propósito)
```tsx
<Reveal>contenido que aparece al entrar en viewport</Reveal>
<Stagger><StaggerItem>ítem 1</StaggerItem><StaggerItem>ítem 2</StaggerItem></Stagger>
```

---

## 6. Modelo de datos — recordatorio

- **ID:** uuid (v4). Todos los modelos tienen `createdAt` + `updatedAt`.
- **Borrado lógico:** `deletedAt` donde aplique (no borrar registros de registro/pagos).
- **Nuevo campo en DB:** SIEMPRE crea una migración incremental:
  ```bash
  cd packages/db
  prisma migrate diff --from-url "$DIRECT_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/TIMESTAMP_nombre/migration.sql
  prisma migrate deploy
  ```
- **Nuevo servicio:** agrégalo a `packages/db/src/index.ts`.

---

## 7. Verificación — antes de marcar algo como "hecho"

Checklist mínimo:

```bash
# Tipos
pnpm -r --filter './packages/*' typecheck

# Build de la web
pnpm --filter @eventflow/web build

# Tests de dominio
pnpm --filter @eventflow/core test

# Si hay cambios en DB: verificar aislamiento multi-tenant
pnpm --filter @eventflow/db exec tsx scripts/verify-[modulo].ts
```

**Un módulo NO está hecho si:**
- TypeScript tiene errores
- El build de Next falla
- Hay un query sin `tenantId` en un servicio de negocio
- La API devuelve datos de otro tenant

---

## 8. Cómo añadir una funcionalidad nueva

1. **Esquema** (si hay nuevos campos/tablas): actualiza `schema.prisma` + migración
2. **Servicio** en `packages/db/src/services/nuevo.ts` + exportar en `index.ts`
3. **API route** en `apps/web/src/app/api/v1/.../route.ts`
4. **Server Action** (si es formulario) en el directorio de la página
5. **Página/UI** en `apps/web/src/app/dashboard/...`
6. **Test de verificación** en `packages/db/scripts/verify-nuevo.ts`
7. Actualizar `PROGRESS.md` con lo que se hizo

---

## 9. Qué NO hacer nunca

- ❌ `tenantId` en la URL o en el cuerpo del request para resolver autorización
- ❌ Queries sin `where: { tenantId }` en tablas de negocio
- ❌ `any` en TypeScript (salvo justificación documentada)
- ❌ Lógica de negocio en páginas/componentes React (va en `packages/db/services`)
- ❌ Romper contratos de API existentes sin actualizar consumidores
- ❌ Subir secrets o credenciales (`.env` está en `.gitignore`)
- ❌ Modificar migraciones ya aplicadas (solo agregar nuevas)
- ❌ Imports circulares entre packages

---

## 10. Convenciones de commits

```
feat(fase-N): descripción corta

- detalle 1
- detalle 2
- Verificado contra DB real / typecheck OK / build OK
```

Prefijos: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`

---

## 11. Variables de entorno requeridas

Para desarrollo local (ver `.env.example`):
```
DATABASE_URL    → Supabase pooler transacción :6543
DIRECT_URL      → Supabase pooler sesión :5432
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
AUTH_SECRET     → string aleatorio largo
```

Opcionales (activar funcionalidades):
```
SES_SMTP_*      → emails reales (Amazon SES)
STRIPE_*        → pagos online
CRON_SECRET     → seguridad del cron de Vercel
```

---

## 12. Estructura de respuestas API

```typescript
// Siempre usar los helpers de apps/web/src/lib/api.ts:
return ok(data);                           // 200 { data: ... }
return ok(data, { status: 201 });          // 201 { data: ... }
return fail(404, 'NOT_FOUND', 'mensaje');  // { error: { code, message } }

// Códigos de error estándar del proyecto:
// 401 UNAUTHENTICATED  — sin sesión
// 403 FORBIDDEN        — sin permiso
// 402 PLAN_LIMIT       — límite del plan
// 404 NOT_FOUND        — recurso no existe en este tenant
// 409 CONFLICT         — duplicado
// 422 VALIDATION_ERROR — datos inválidos (Zod)
```

---

## 13. Recursos útiles en el repo

| Necesitas | Ve a |
|-----------|------|
| Entender el modelo de datos | `PRD/04-MODELO-DE-DATOS.md` |
| Entender la especificación | `PRD/05-MODULOS-FUNCIONALES.md` |
| Ver los contratos de API | `PRD/06-API-CONTRATOS.md` |
| Estado de implementación | `PROGRESS.md` |
| Decisiones técnicas | `DECISIONS.md` |
| Guía de despliegue | `DEPLOY.md` |
| Ejemplos de servicios | `packages/db/src/services/*.ts` |
| Ejemplos de API routes | `apps/web/src/app/api/v1/events/route.ts` |
| Ejemplos de Server Actions | `apps/web/src/app/dashboard/actions.ts` |
