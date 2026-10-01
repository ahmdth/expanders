import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthenticationModule, JwtSigner } from '@nestjs/authentication';
import { AuthorizationModule } from '@nestjs/authorization';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtAuth } from '../src/auth/jwt-auth.provider.js';
import { Role } from '../src/common/role.enum.js';
import { AdminPolicy } from '../src/policies/admin.policy.js';
import { ProjectsController } from '../src/projects/projects.controller.js';
import { ProjectsService } from '../src/projects/projects.service.js';
import { User } from '../src/users/user.entity.js';
import { VendorsController } from '../src/vendors/vendors.controller.js';
import { VendorsService } from '../src/vendors/vendors.service.js';

const JWT = {
  key: 'test-secret-test-secret-test-secret-123',
  issuer: 'expanders360-api',
  audience: 'expanders360-clients',
  ttl: '15m' as const,
};
const USERS: Record<number, Partial<User>> = {
  1: { id: 1, email: 'admin@x.io', role: Role.ADMIN, clientId: null },
  2: { id: 2, email: 'c@x.io', role: Role.CLIENT, clientId: 10 },
};

/**
 * HTTP-level test with the REAL @nestjs/authentication and @nestjs/authorization modules
 * (guard order, JWT verification, @Can on routes); only the database-backed services are mocked.
 */
describe('Auth & roles (HTTP)', () => {
  let app: INestApplication;
  const projectsSvc = { findAll: vi.fn(async () => [{ id: 1 }]) };
  const authSvc = {
    register: vi.fn(async () => ({ accessToken: 't' })),
    login: vi.fn(async () => ({ accessToken: 't' })),
  };
  const signer = new JwtSigner(JWT);
  const bearer = (sub: number | string, s = signer) =>
    `Bearer ${s.sign({ sub: String(sub) })}`;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        AuthenticationModule.forRoot({ accessToken: JWT }), // must come before authorization
        AuthorizationModule.forRoot({ policies: [AdminPolicy] }),
      ],
      controllers: [AuthController, VendorsController, ProjectsController],
      providers: [
        JwtAuth,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOneBy: async ({ id }: { id: number }) => USERS[id] ?? null,
          },
        },
        { provide: AuthService, useValue: authSvc },
        { provide: VendorsService, useValue: { findAll: async () => [] } },
        { provide: ProjectsService, useValue: projectsSvc },
      ],
    }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());

  it('rejects requests without a token (401)', async () => {
    await http().get('/vendors').expect(401);
    await http().get('/projects').expect(401);
  });
  it('rejects a token signed with another key (401)', async () => {
    const forged = new JwtSigner({
      ...JWT,
      key: 'another-secret-another-secret-12345678',
    });
    await http()
      .get('/vendors')
      .set('authorization', bearer(1, forged))
      .expect(401);
  });
  it('rejects a token whose user no longer exists (401)', async () => {
    await http().get('/projects').set('authorization', bearer(99)).expect(401);
  });
  it('blocks clients from admin routes (403)', async () => {
    await http().get('/vendors').set('authorization', bearer(2)).expect(403);
  });
  it('lets admins into admin routes', async () => {
    await http().get('/vendors').set('authorization', bearer(1)).expect(200);
  });
  it('trusts the DB for the role, not the token', async () => {
    // a client whose token claims to be admin is still a client
    const sneaky = `Bearer ${signer.sign({ sub: '2', role: 'admin' })}`;
    await http().get('/vendors').set('authorization', sneaky).expect(403);
  });
  it('passes the caller identity (role + clientId) to services', async () => {
    await http().get('/projects').set('authorization', bearer(2)).expect(200);
    expect(projectsSvc.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ role: Role.CLIENT, clientId: 10 }),
    );
  });

  describe('public auth routes + validation', () => {
    it('register/login need no token', async () => {
      await http()
        .post('/auth/register')
        .send({
          companyName: 'Acme',
          email: 'a@acme.io',
          password: 'password123',
        })
        .expect(201);
      await http()
        .post('/auth/login')
        .send({ email: 'a@acme.io', password: 'x' })
        .expect(200);
    });
    it('rejects invalid payloads (400)', async () => {
      await http()
        .post('/auth/register')
        .send({
          companyName: 'Acme',
          email: 'not-an-email',
          password: 'password123',
        })
        .expect(400);
      await http()
        .post('/auth/register')
        .send({ companyName: 'Acme', email: 'a@acme.io', password: 'short' })
        .expect(400);
    });
    it('rejects unknown fields such as role escalation (400)', async () => {
      await http()
        .post('/auth/register')
        .send({
          companyName: 'Acme',
          email: 'a@acme.io',
          password: 'password123',
          role: 'admin',
        })
        .expect(400);
    });
  });
});
