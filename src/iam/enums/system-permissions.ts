export const SYSTEM_PERMISSIONS = [
  'users.read',
  'users.write',
  'users.delete',
  'users.status.write',
  'roles.read',
  'roles.write',
  'roles.assign',
  'vehicles.read',
  'vehicles.write',
  'vehicles.delete',
  'reservations.read',
  'reservations.manage',
  'fleet.read',
  'fleet.manage',
  'admin.kpi.read',
] as const;

export type SystemPermissionCode = (typeof SYSTEM_PERMISSIONS)[number];
