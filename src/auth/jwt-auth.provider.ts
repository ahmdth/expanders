import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthenticationRegistry, JwtBearerProvider, type JwtClaims } from '@nestjs/authentication';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/auth-user.js';
import { User } from '../users/user.entity.js';

/**
 * Verifies `Authorization: Bearer <jwt>` and loads the user from MySQL, so roles are never trusted
 * from the token and a deleted user's token stops working immediately.
 */
@Injectable()
export class JwtAuth extends JwtBearerProvider<AuthUser> {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    registry: AuthenticationRegistry,
  ) {
    super({ realm: 'expanders360' }); // key/issuer/audience come from the module's `accessToken` options
    registry.registerProvider(this); // adds this provider to the chain the global guard runs
  }

  async validate({ sub }: JwtClaims): Promise<AuthUser | null> {
    const id = Number(sub);
    if (!sub || !Number.isInteger(id)) return null;
    const user = await this.users.findOneBy({ id });
    return user ? { userId: user.id, email: user.email, role: user.role, clientId: user.clientId } : null;
  }
}
