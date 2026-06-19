import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../src/index';

/**
 * Crea (o actualiza) el Super Admin de la plataforma:
 * usuario en Supabase Auth + fila User con isSuperAdmin=true (sin tenant).
 *
 * Uso: SUPERADMIN_EMAIL=... [SUPERADMIN_PASSWORD=...] tsx scripts/bootstrap-superadmin.ts
 */
async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  if (!email) throw new Error('Falta SUPERADMIN_EMAIL');
  const password = process.env.SUPERADMIN_PASSWORD || randomBytes(9).toString('base64url');
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  // 1) Usuario en Supabase Auth (idempotente: si existe, actualiza la contraseña).
  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error && !/already.*registered|exists/i.test(error.message)) {
    throw error;
  }
  if (error) {
    console.log('  (usuario de Auth ya existía)');
  } else {
    console.log('  usuario de Auth creado:', created.user?.id);
  }

  // 2) Fila User con isSuperAdmin.
  await prisma.user.upsert({
    where: { id: created?.user?.id ?? '00000000-0000-0000-0000-000000000000' },
    update: { isSuperAdmin: true, status: 'active', name },
    create: {
      ...(created?.user?.id ? { id: created.user.id } : {}),
      email,
      name,
      isSuperAdmin: true,
      status: 'active',
      tenantId: null,
    },
  }).catch(async () => {
    // Si el upsert por id no aplica (usuario ya existía en Auth), upsert por email.
    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isSuperAdmin: true, status: 'active', name },
      });
    } else {
      await prisma.user.create({
        data: { email, name, isSuperAdmin: true, status: 'active', tenantId: null },
      });
    }
  });

  console.log('✓ Super Admin listo.');
  console.log('  Email:', email);
  if (!process.env.SUPERADMIN_PASSWORD) {
    console.log('  Contraseña temporal:', password);
  }
}

main()
  .catch((e) => {
    console.error('✗ Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
