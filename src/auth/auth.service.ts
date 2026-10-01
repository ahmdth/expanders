import {
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtSigner, PasswordHasher } from '@nestjs/authentication';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity.js';
import { Client } from '../clients/client.entity.js';
import { Role } from '../common/role.enum.js';
import { LoginDto, RegisterDto } from './auth.dto.js';
import { buildJwtOptions } from './jwt-options.js';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  private readonly signer: JwtSigner;

  constructor(
    @InjectRepository(User) private users: Repository<User>,
    private dataSource: DataSource,
    private hasher: PasswordHasher, // provided by AuthenticationModule (scrypt)
    private config: ConfigService,
  ) {
    this.signer = new JwtSigner(buildJwtOptions(config));
  }

  /** Admins can't self-register; seed one from env on first boot. */
  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;
    if (await this.users.exists({ where: { role: Role.ADMIN } })) return;
    await this.users.save(
      this.users.create({
        email: email.toLowerCase(),
        passwordHash: await this.hasher.hash(password),
        role: Role.ADMIN,
        clientId: null,
      }),
    );
    this.logger.log(`Seeded admin user ${email}`);
  }

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    if (await this.users.exists({ where: { email } }))
      throw new ConflictException('Email already registered');
    const passwordHash = await this.hasher.hash(dto.password);
    const user = await this.dataSource.transaction(async (m) => {
      const client = await m.save(
        Client,
        m.create(Client, { companyName: dto.companyName, contactEmail: email }),
      );
      return m.save(
        User,
        m.create(User, {
          email,
          passwordHash,
          role: Role.CLIENT,
          clientId: client.id,
        }),
      );
    });
    return this.token(user);
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    // verify() with an unknown user checks a dummy hash, so timing doesn't reveal which emails exist
    const valid = await this.hasher.verify(dto.password, user?.passwordHash);
    if (!user || !valid) throw new UnauthorizedException('Invalid credentials');
    if (this.hasher.needsRehash(user.passwordHash)) {
      await this.users.update(user.id, {
        passwordHash: await this.hasher.hash(dto.password),
      });
    }
    return this.token(user);
  }

  private token(user: User) {
    // Only `sub` goes in the token: role/clientId are loaded from the DB by JwtAuth on every request.
    return {
      accessToken: this.signer.sign({ sub: String(user.id) }),
      role: user.role,
      clientId: user.clientId,
    };
  }
}
