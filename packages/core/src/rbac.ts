/** RBAC — catálogo de permisos y verificación. PRD/02 §2.2. */

export const PERMISSIONS = [
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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Roles de sistema con sus permisos por defecto (plantillas por tenant). */
export const SYSTEM_ROLES = {
  org_admin: [...PERMISSIONS],
  manager: [
    'event:create',
    'event:edit',
    'event:publish',
    'landing:edit',
    'registration:view',
    'registration:export',
    'messaging:configure',
    'messaging:send',
    'campaign:schedule',
    'report:view',
    'report:export',
    'ai:configure',
    'ai:knowledge:manage',
  ],
  staff: ['checkin:scan', 'registration:view'],
  presenter: ['raffle:run', 'registration:view'],
} satisfies Record<string, Permission[]>;

/** Verifica si un conjunto de permisos satisface el requerido. */
export function hasPermission(granted: readonly string[], required: Permission): boolean {
  return granted.includes(required);
}

/** Verifica si se cumplen TODOS los permisos requeridos. */
export function hasAllPermissions(
  granted: readonly string[],
  required: readonly Permission[],
): boolean {
  return required.every((p) => granted.includes(p));
}
