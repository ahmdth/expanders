import { Policy, type PolicyBefore } from '@nestjs/authorization';
import { AuthUser } from '../common/auth-user.js';
import { Role } from '../common/role.enum.js';
import type { Project } from './project.entity.js';

/** Clients manage their own projects; admins manage everything (via before()). */
@Policy()
export class ProjectPolicy implements PolicyBefore<AuthUser> {
  before(user: AuthUser | null) {
    if (user?.role === Role.ADMIN) return true;
  }

  /** May this user read/modify this project (and its matches and research documents)? */
  access(user: AuthUser, project: Pick<Project, 'clientId'>) {
    return user.clientId !== null && project.clientId === user.clientId;
  }

  /** May this user see every project (not just their own)? Admins only, through before(). */
  viewAll(_user: AuthUser) {
    return false;
  }
}
