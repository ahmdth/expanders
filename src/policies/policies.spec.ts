import { describe, expect, it } from 'vitest';
import { AuthUser } from '../common/auth-user.js';
import { Role } from '../common/role.enum.js';
import { ProjectPolicy } from '../projects/project.policy.js';
import { AdminPolicy } from './admin.policy.js';

const client = (clientId: number): AuthUser => ({ userId: 1, email: 'c@x.io', role: Role.CLIENT, clientId });
const admin: AuthUser = { userId: 2, email: 'a@x.io', role: Role.ADMIN, clientId: null };

describe('AdminPolicy', () => {
  const policy = new AdminPolicy();
  it('allows admins only', () => {
    expect(policy.manage(admin)).toBe(true);
    expect(policy.manage(client(1))).toBe(false);
    expect(policy.manage(null)).toBe(false);
  });
});

describe('ProjectPolicy', () => {
  const policy = new ProjectPolicy();
  it('before(): admins pass every check, others fall through to the ability', () => {
    expect(policy.before(admin)).toBe(true);
    expect(policy.before(client(1))).toBeUndefined();
    expect(policy.before(null)).toBeUndefined();
  });
  it('access: a client reaches only their own projects', () => {
    expect(policy.access(client(10), { clientId: 10 })).toBe(true);
    expect(policy.access(client(10), { clientId: 11 })).toBe(false);
  });
  it('access: a user without a client reaches nothing', () => {
    expect(policy.access({ ...client(1), clientId: null }, { clientId: 1 })).toBe(false);
  });
  it('viewAll: clients never (admins get it from before())', () => {
    expect(policy.viewAll(client(1))).toBe(false);
  });
});
