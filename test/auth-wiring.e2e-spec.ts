import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthenticationModule, PasswordHasher } from '@nestjs/authentication';
import { DataSource } from 'typeorm';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../src/auth/auth.service.js';
import { buildJwtOptions } from '../src/auth/jwt-options.js';
import { User } from '../src/users/user.entity.js';
import { ConfigService } from '@nestjs/config';

/** Proves Nest's DI hands AuthService the PasswordHasher that AuthenticationModule provides. */
describe('AuthService DI wiring', () => {
  it('injects PasswordHasher from AuthenticationModule and hashes with scrypt', async () => {
    const saved: any[] = [];
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({ JWT_SECRET: 'wiring-test-secret-wiring-test-secret-1' }),
          ],
        }),
        AuthenticationModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (c: ConfigService) => ({
            accessToken: buildJwtOptions(c),
            password: { logN: 10 },
          }),
        }),
      ],
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            exists: async () => false,
            save: async (x: any) => saved.push(x),
          },
        },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();
    await moduleRef.init();

    const hasher = moduleRef.get(PasswordHasher);
    expect(moduleRef.get(AuthService)).toBeDefined();
    const hash = await hasher.hash('correct horse battery staple');
    expect(hash).toMatch(/^\$scrypt\$ln=10,/); // the module's `password` options are applied
    expect(await hasher.verify('correct horse battery staple', hash)).toBe(
      true,
    );
    expect(await hasher.verify('wrong', hash)).toBe(false);
    await moduleRef.close();
  });
});
