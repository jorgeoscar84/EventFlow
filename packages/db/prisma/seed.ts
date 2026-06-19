import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed base: catálogo de permisos, plan inicial y super admin.
 * Ejecutar con: pnpm --filter @eventflow/db exec tsx prisma/seed.ts
 */
const PERMISSIONS = [
  'tenant:manage',
  'team:manage',
  'billing:manage',
  'event:create',
  'event:edit',
  'event:publish',
  'event:delete',
  'landing:edit',
  'registration:view',
  'registration:export',
  'messaging:configure',
  'messaging:send',
  'campaign:schedule',
  'checkin:scan',
  'raffle:run',
  'payment:view',
  'payment:manage',
  'report:view',
  'report:export',
  'ai:configure',
  'ai:knowledge:manage',
];

async function main() {
  // Permisos
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }

  // Plan inicial
  await prisma.plan.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Starter',
      priceCents: 0,
      interval: 'month',
      isActive: true,
      limits: {
        activeEvents: 3,
        attendeesPerMonth: 1000,
        teamMembers: 5,
        emailsPerMonth: 10000,
        customDomain: false,
        modules: ['raffle', 'ai'],
      },
    },
  });

  console.log('Seed completado: permisos y plan Starter.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
