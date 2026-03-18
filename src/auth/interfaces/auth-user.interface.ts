export interface AuthUser {
  sub: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
}
