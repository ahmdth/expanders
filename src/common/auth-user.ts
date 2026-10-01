import { Role } from './role.enum.js';

/** What `JwtAuth` puts on `request.user` (loaded fresh from MySQL on every request). */
export interface AuthUser {
  userId: number;
  email: string;
  role: Role;
  clientId: number | null;
}
