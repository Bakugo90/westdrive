export const SYSTEM_PERMISSIONS = [
  'users.read',
  'users.status.write',
  'roles.read',
  'roles.write',
  'roles.assign',
  'reservations.read',
  'reservations.manage',
  'fleet.read',
  'fleet.manage',
  'admin.kpi.read',
] as const;

export type SystemPermissionCode = (typeof SYSTEM_PERMISSIONS)[number];
