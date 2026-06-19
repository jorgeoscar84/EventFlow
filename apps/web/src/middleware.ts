import { NextResponse, type NextRequest } from 'next/server';
import { resolveTenantFromHost } from '@eventflow/core';

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? 'eventflow.app';

/**
 * Middleware de resolución de tenant (PRD/02 §2.3).
 * Inyecta el slug del tenant en el header `x-tenant-slug` para que las
 * rutas/servicios lo usen al fijar el contexto (app.tenant_id / RLS).
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host');
  const { slug } = resolveTenantFromHost(host, ROOT_DOMAIN);

  const requestHeaders = new Headers(req.headers);
  if (slug) {
    requestHeaders.set('x-tenant-slug', slug);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Excluye assets estáticos y la API interna de Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
