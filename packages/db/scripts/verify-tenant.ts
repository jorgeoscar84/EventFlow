import { prisma } from '../src/index';
import { provisionTenant } from '../src/services/tenant';

/**
 * Verificación de integración contra la DB real (PRD M2 / CA-02.2):
 * aprovisiona un tenant demo, comprueba roles/permisos/admin y limpia.
 */
async function main() {
  const slug = `demo-${Date.now()}`;
  console.log(`→ Aprovisionando tenant "${slug}"...`);

  const result = await provisionTenant({
    name: 'Demo Org',
    slug,
    adminEmail: `admin@${slug}.test`,
    adminName: 'Admin Demo',
  });

  console.log('  tenantId:', result.tenantId);
  console.log('  adminUserId:', result.adminUserId);
  console.log('  roles:', result.rolesCreated.join(', '));

  const orgAdmin = await prisma.role.findFirst({
    where: { tenantId: result.tenantId, name: 'org_admin' },
    include: { rolePermissions: true },
  });
  console.log('  permisos de org_admin:', orgAdmin?.rolePermissions.length);

  const userWithRoles = await prisma.user.findUnique({
    where: { id: result.adminUserId },
    include: { userRoles: true },
  });
  console.log('  roles del admin:', userWithRoles?.userRoles.length);

  // Limpieza (cascada borra roles/usuarios del tenant).
  await prisma.tenant.delete({ where: { id: result.tenantId } });
  console.log('✓ Verificación OK y tenant demo eliminado.');
}

main()
  .catch((e) => {
    console.error('✗ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
