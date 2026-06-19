# Guía de Despliegue — Eventflow en Vercel

> Todo el proyecto se despliega en **Vercel** sin servidor adicional.
> La base de datos (Supabase), storage y auth ya están en la nube.
> El worker de mensajería funciona como **Vercel Cron Job** (sin Redis ni proceso persistente).

---

## Arquitectura en producción

```
Vercel (Next.js)
├── Rutas SSR/API   → panel admin + landings + APIs
├── Vercel Cron     → /api/cron/scheduler (cada 5 min) → recordatorios SES
└── Edge Middleware → resolución de tenant por subdominio

Supabase
├── PostgreSQL + pgvector  → todos los datos
├── Auth                   → sesiones de usuario
└── Storage                → imágenes (pendiente de conectar)

Amazon SES  → envío de emails (pendiente de configurar)
Stripe      → pagos (pendiente de configurar)
```

---

## Pasos de despliegue

### 1. Prepara el repositorio de GitHub
El repositorio ya está en: https://github.com/jorgeoscar84/EventFlow

### 2. Crea un proyecto en Vercel

1. Entra a https://vercel.com → **Add New Project**
2. Importa el repositorio `jorgeoscar84/EventFlow`
3. En la configuración del proyecto, **antes de hacer deploy**:

   | Opción | Valor |
   |--------|-------|
   | **Framework Preset** | Next.js (auto-detectado) |
   | **Root Directory** | `apps/web` |
   | Install Command | *(dejar vacío — lo define `vercel.json`)* |
   | Build Command | *(dejar vacío — lo define `vercel.json`)* |
   | Output Directory | `.next` |

### 3. Configura las variables de entorno en Vercel

Ve a **Settings → Environment Variables** y añade (mínimo para que funcione):

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `APP_BASE_URL` | `https://TU-PROYECTO.vercel.app` | URL pública del deploy |
| `DATABASE_URL` | `postgresql://postgres.REF:PASS@aws-1-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true` | Pooler transacción |
| `DIRECT_URL` | `postgresql://postgres.REF:PASS@aws-1-REGION.pooler.supabase.com:5432/postgres` | Pooler sesión (migraciones) |
| `SUPABASE_URL` | `https://REF.supabase.co` | |
| `SUPABASE_ANON_KEY` | `sb_publishable_...` | |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_...` | ⚠️ Solo en producción |
| `AUTH_SECRET` | *(string aleatorio largo)* | `openssl rand -base64 36` |
| `CRON_SECRET` | *(string aleatorio)* | Protege el endpoint del cron |

Variables opcionales (funcionalidad extra):
```
SES_SMTP_HOST / SES_SMTP_USER / SES_SMTP_PASS  → emails reales
MAIL_FROM_DEFAULT                               → remitente de emails
STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET       → pagos online
```

### 4. Primer deploy

Haz clic en **Deploy**. Vercel:
1. Ejecuta `pnpm install` desde la raíz del monorepo
2. Genera el cliente Prisma (`prisma generate`)
3. Construye Next.js (`next build`)
4. Activa el cron job `/api/cron/scheduler` cada 5 minutos

### 5. Aplica las migraciones en Supabase

Las migraciones ya están aplicadas (lo hiciste en el setup inicial).
Si necesitas re-aplicarlas:
```bash
# Desde tu máquina local con las variables configuradas en .env:
pnpm --filter @eventflow/db run migrate:deploy
```

### 6. Crea el Super Admin (primera vez)

```bash
# Desde tu máquina local:
cd packages/db
SUPERADMIN_EMAIL=tu@email.com \
SUPERADMIN_NAME="Tu Nombre" \
tsx scripts/bootstrap-superadmin.ts
```

Luego ve a `https://TU-PROYECTO.vercel.app/login` e inicia sesión.

---

## Cron Job de mensajería

El endpoint `/api/cron/scheduler`:
- Se ejecuta **cada 5 minutos** (configurable en `apps/web/vercel.json`)
- Materializa campañas de recordatorios programados
- Envía los emails vencidos por Amazon SES
- Está protegido con `CRON_SECRET` (Vercel lo inyecta automáticamente)

**Plan gratuito de Vercel:** el cron mínimo es 1 vez al día. Para recordatorios en tiempo real, upgrade a Vercel Pro o usa el worker local en desarrollo.

---

## Variables del Cron en Vercel
Vercel inyecta automáticamente `Authorization: Bearer CRON_SECRET` cuando llama al cron.
Solo debes definir `CRON_SECRET` en las variables de entorno del proyecto.

---

## Desarrollo local

```bash
# 1. Instala dependencias
pnpm install

# 2. Copia y configura el .env
cp .env.example .env
# Edita .env con tus credenciales de Supabase

# 3. Arranca la app web
pnpm --filter @eventflow/web dev

# 4. (Opcional) Arranca el worker de mensajería en local
pnpm --filter @eventflow/worker dev

# 5. (Opcional) Invoca el cron manualmente
curl http://localhost:3000/api/cron/scheduler
```

---

## URLs del proyecto desplegado

| Sección | URL |
|---------|-----|
| Home | `https://dominio.vercel.app/` |
| Panel admin | `https://dominio.vercel.app/dashboard` |
| Super Admin | `https://dominio.vercel.app/superadmin/tenants` |
| Evento demo | `https://dominio.vercel.app/o/demo/future-summit-2026` |
| Check-in (PWA) | `https://dominio.vercel.app/checkin` |
| Cron (protegido) | `https://dominio.vercel.app/api/cron/scheduler` |

---

## Notas de seguridad antes de ir a producción
1. **Rota las claves de Supabase** que compartiste durante el desarrollo
2. Genera un nuevo `AUTH_SECRET` fuerte
3. Verifica el dominio en Amazon SES y configura DKIM/SPF/DMARC
4. Activa 2FA en Vercel y en Supabase
5. Revisa los límites del plan de Supabase (free: 500MB DB, 1GB storage)
