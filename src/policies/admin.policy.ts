import { Policy } from '@nestjs/authorization';
import { AuthUser } from '../common/auth-user.js';
import { Role } from '../common/role.enum.js';

/** Routes only admins may use: vendors, system configs, scheduler jobs, analytics. */
@Policy()
export class AdminPolicy {
  manage(user: AuthUser | null) {
    return user?.role === Role.ADMIN;
  }
}
