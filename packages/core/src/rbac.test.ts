import { describe, it, expect } from 'vitest';
import { hasPermission, hasAllPermissions, SYSTEM_ROLES } from './rbac';
import { resolveTenantFromHost, isValidSlug } from './tenant';

describe('rbac', () => {
  it('org_admin tiene todos los permisos clave', () => {
    expect(hasPermission(SYSTEM_ROLES.org_admin, 'billing:manage')).toBe(true);
    expect(hasPermission(SYSTEM_ROLES.org_admin, 'event:delete')).toBe(true);
  });

  it('staff solo puede escanear y ver registros', () => {
    expect(hasPermission(SYSTEM_ROLES.staff, 'checkin:scan')).toBe(true);
    expect(hasPermission(SYSTEM_ROLES.staff, 'billing:manage')).toBe(false);
  });

  it('hasAllPermissions exige todos', () => {
    expect(hasAllPermissions(SYSTEM_ROLES.manager, ['event:create', 'report:export'])).toBe(true);
    expect(hasAllPermissions(SYSTEM_ROLES.manager, ['event:create', 'billing:manage'])).toBe(false);
  });
});

describe('tenant resolution', () => {
  const root = 'eventflow.app';

  it('resuelve subdominio de tenant', () => {
    expect(resolveTenantFromHost('acme.eventflow.app', root)).toEqual({
      slug: 'acme',
      strategy: 'subdomain',
    });
  });

  it('ignora subdominios reservados', () => {
    expect(resolveTenantFromHost('www.eventflow.app', root).slug).toBeNull();
    expect(resolveTenantFromHost('app.eventflow.app', root).slug).toBeNull();
  });

  it('localhost usa estrategia de ruta', () => {
    expect(resolveTenantFromHost('localhost:3000', root).strategy).toBe('path');
  });

  it('valida slugs', () => {
    expect(isValidSlug('acme-corp')).toBe(true);
    expect(isValidSlug('Acme')).toBe(false);
    expect(isValidSlug('-bad')).toBe(false);
  });
});
