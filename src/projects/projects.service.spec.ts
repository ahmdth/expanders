import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthUser } from '../common/auth-user.js';
import { Role } from '../common/role.enum.js';
import { ProjectPolicy } from './project.policy.js';
import { ProjectsService } from './projects.service.js';

const client: AuthUser = { userId: 1, email: 'a@acme.io', role: Role.CLIENT, clientId: 10 };
const admin: AuthUser = { userId: 2, email: 'admin@x.io', role: Role.ADMIN, clientId: null };

/** Stand-in for AuthorizationService that runs the REAL ProjectPolicy (before() hook included). */
const authz = {
  can: async (_policy: unknown, ability: 'access' | 'viewAll', user: AuthUser, ...args: any[]) => {
    const policy = new ProjectPolicy();
    const before = policy.before(user);
    return before !== undefined ? before : (policy[ability] as any)(user, ...args);
  },
};

describe('ProjectsService', () => {
  let repo: any, service: ProjectsService;
  beforeEach(() => {
    repo = {
      findOne: vi.fn(),
      find: vi.fn(async () => []),
      create: vi.fn((x) => x),
      save: vi.fn(async (x) => ({ id: 99, ...x })),
      delete: vi.fn(),
    };
    service = new ProjectsService(repo, authz as any);
  });

  describe('findOneAuthorized', () => {
    it('lets a client read their own project', async () => {
      repo.findOne.mockResolvedValue({ id: 5, clientId: 10 });
      await expect(service.findOneAuthorized(client, 5)).resolves.toMatchObject({ id: 5 });
    });
    it("hides another client's project behind a 404", async () => {
      repo.findOne.mockResolvedValue({ id: 5, clientId: 11 });
      await expect(service.findOneAuthorized(client, 5)).rejects.toBeInstanceOf(NotFoundException);
    });
    it('lets admins read any project', async () => {
      repo.findOne.mockResolvedValue({ id: 5, clientId: 11 });
      await expect(service.findOneAuthorized(admin, 5)).resolves.toMatchObject({ id: 5 });
    });
    it('404s when missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(service.findOneAuthorized(admin, 404)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = { country: 'DE', servicesNeeded: ['legal'], budget: 1000 };
    it("forces the caller's clientId for clients, ignoring the body", async () => {
      await service.create(client, { ...dto, clientId: 999 });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ clientId: 10, status: 'draft' }));
    });
    it('requires clientId for admins', async () => {
      await expect(service.create(admin, dto)).rejects.toBeInstanceOf(ForbiddenException);
      await service.create(admin, { ...dto, clientId: 7 });
      expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ clientId: 7 }));
    });
  });

  it('findAll scopes clients to their own projects, admins see all', async () => {
    await service.findAll(client);
    expect(repo.find).toHaveBeenLastCalledWith(expect.objectContaining({ where: { clientId: 10 } }));
    await service.findAll(admin);
    expect(repo.find).toHaveBeenLastCalledWith(expect.objectContaining({ where: {} }));
  });

  it('accessibleIds: null (unrestricted) for admins, own ids for clients', async () => {
    expect(await service.accessibleIds(admin)).toBeNull();
    repo.find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    expect(await service.accessibleIds(client)).toEqual([1, 2]);
  });

  it('update cannot reassign the owning client', async () => {
    repo.findOne.mockResolvedValue({ id: 5, clientId: 10, country: 'DE', client: { id: 10 } });
    await service.update(client, 5, { country: 'FR', clientId: 999 });
    const saved = repo.save.mock.calls[0][0];
    expect(saved).toMatchObject({ clientId: 10, country: 'FR' });
    expect(saved.client).toBeUndefined();
  });
});
