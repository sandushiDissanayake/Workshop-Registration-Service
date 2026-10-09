export type Role = 'ADMIN' | 'MANAGER' | 'STAFF';
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}
