import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../common/role.enum.js';
import { AuthService } from './auth.service.js';

const env: Record<string, string> = {
  JWT_SECRET: 'unit-test-secret-unit-test-secret-1234',
  JWT_EXPIRES_IN: '15m',
};
const config = {
  get: (k: string) => env[k],
  getOrThrow: (k: string) => env[k],
};
const claimsOf = (jwt: string) =>
  JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString());

describe('AuthService (scrypt via PasswordHasher, JWT via JwtSigner)', () => {
  const hasher = new PasswordHasher({ logN: 10 }); // cheap cost for tests
  let users: any, manager: any, service: AuthService, stored: any;

  beforeEach(() => {
    stored = undefined;
    users = {
      exists: vi.fn(async () => false),
      findOne: vi.fn(async () => stored ?? null),
      update: vi.fn(),
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => x),
    };
    manager = {
      create: vi.fn((_e, x) => x),
      save: vi.fn(async (entity, x) =>
        entity.name === 'Client' ? { id: 7, ...x } : { id: 3, ...x },
      ),
    };
    const dataSource = { transaction: async (fn: any) => fn(manager) };
    service = new AuthService(users, dataSource as any, hasher, config as any);
  });

  it('register: hashes with scrypt (no plaintext), creates client + user, returns a JWT with only `sub`', async () => {
    const res = await service.register({
      companyName: 'Acme',
      email: 'Founder@Acme.io',
      password: 'password123',
    });

    const userArg = manager.save.mock.calls.find(
      ([e]: any) => e.name === 'User',
    )[1];
    expect(userArg.email).toBe('founder@acme.io');
    expect(userArg.passwordHash).toMatch(/^\$scrypt\$/);
    expect(userArg.passwordHash).not.toContain('password123');
    expect(await hasher.verify('password123', userArg.passwordHash)).toBe(true);

    const claims = claimsOf(res.accessToken);
    expect(claims.sub).toBe('3');
    expect(claims).not.toHaveProperty('role'); // roles are loaded from the DB on each request, never trusted from the token
    expect(claims.iss).toBe('expanders360-api');
    expect(res).toMatchObject({ role: Role.CLIENT, clientId: 7 });
  });

  it('register: rejects a duplicate email', async () => {
    users.exists.mockResolvedValue(true);
    await expect(
      service.register({
        companyName: 'A',
        email: 'a@a.io',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('login: succeeds with the right password', async () => {
    stored = {
      id: 5,
      email: 'a@a.io',
      role: Role.CLIENT,
      clientId: 1,
      passwordHash: await hasher.hash('s3cret-pass'),
    };
    const res = await service.login({
      email: 'A@a.io',
      password: 's3cret-pass',
    });
    expect(claimsOf(res.accessToken).sub).toBe('5');
    expect(users.update).not.toHaveBeenCalled(); // hash params are current → no rehash
  });

  it('login: wrong password and unknown email are indistinguishable (401)', async () => {
    stored = {
      id: 5,
      email: 'a@a.io',
      role: Role.CLIENT,
      clientId: 1,
      passwordHash: await hasher.hash('s3cret-pass'),
    };
    await expect(
      service.login({ email: 'a@a.io', password: 'nope' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    stored = undefined;
    const spy = vi.spyOn(hasher, 'verify');
    await expect(
      service.login({ email: 'ghost@a.io', password: 'nope' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(spy).toHaveBeenCalledWith('nope', undefined); // dummy-hash path: constant-ish time for unknown users
  });

  it('login: upgrades a hash made with weaker parameters', async () => {
    const weak = new PasswordHasher({ logN: 10 });
    const strongerService = new AuthService(
      users,
      {} as any,
      new PasswordHasher({ logN: 11 }),
      config as any,
    );
    stored = {
      id: 5,
      email: 'a@a.io',
      role: Role.CLIENT,
      clientId: 1,
      passwordHash: await weak.hash('s3cret-pass'),
    };
    await strongerService.login({ email: 'a@a.io', password: 's3cret-pass' });
    expect(users.update).toHaveBeenCalledWith(5, {
      passwordHash: expect.stringMatching(/^\$scrypt\$ln=11/),
    });
  });
});
