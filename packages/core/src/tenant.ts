/** Resolución de tenant a partir del host. PRD/02 §2.3 (subdominio o ruta). */

export interface TenantResolution {
  slug: string | null;
  strategy: 'subdomain' | 'path' | 'none';
}

const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'superadmin', 'static']);

/**
 * Extrae el slug del tenant del host.
 * - Producción: `{tenant}.dominio.com` -> subdominio.
 * - Localhost / dominio raíz: devuelve null (resolver por ruta /{tenant}).
 */
export function resolveTenantFromHost(host: string | null, rootDomain: string): TenantResolution {
  if (!host) return { slug: null, strategy: 'none' };

  const hostname = host.split(':')[0]?.toLowerCase() ?? '';

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { slug: null, strategy: 'path' };
  }

  const root = rootDomain.toLowerCase();
  if (hostname === root || hostname === `www.${root}`) {
    return { slug: null, strategy: 'none' };
  }

  if (hostname.endsWith(`.${root}`)) {
    const sub = hostname.slice(0, -1 * (`.${root}`.length));
    const firstLabel = sub.split('.')[0] ?? '';
    if (!firstLabel || RESERVED_SUBDOMAINS.has(firstLabel)) {
      return { slug: null, strategy: 'none' };
    }
    return { slug: firstLabel, strategy: 'subdomain' };
  }

  return { slug: null, strategy: 'none' };
}

/** Valida el formato de un slug de tenant/evento. */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug);
}
