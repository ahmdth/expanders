import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SchedulerService } from './scheduler.service.js';

describe('SchedulerService', () => {
  let env: Record<string, string>, settings: any, projects: any, matches: any, vendors: any, svc: SchedulerService;

  beforeEach(() => {
    env = {};
    settings = { isEnabled: vi.fn(async () => true) };
    projects = { findActive: vi.fn(async () => [{ id: 1 }, { id: 2 }]) };
    matches = { rebuildForProject: vi.fn(async () => ({})) };
    vendors = { syncSlaFlags: vi.fn(async () => ({ flagged: 2, cleared: 1 })) };
    svc = new SchedulerService({ get: (k: string) => env[k] } as any, settings, projects, matches, vendors);
  });

  describe('refreshActiveProjects', () => {
    it('rebuilds every active project', async () => {
      await expect(svc.refreshActiveProjects()).resolves.toEqual({ projects: 2, refreshed: 2 });
      expect(matches.rebuildForProject).toHaveBeenCalledTimes(2);
    });
    it('keeps going when one project fails', async () => {
      matches.rebuildForProject.mockRejectedValueOnce(new Error('boom'));
      await expect(svc.refreshActiveProjects()).resolves.toEqual({ projects: 2, refreshed: 1 });
    });
    it('does nothing when ENABLE_SCHEDULER=false', async () => {
      env.ENABLE_SCHEDULER = 'false';
      expect(await svc.refreshActiveProjects()).toBeNull();
      expect(projects.findActive).not.toHaveBeenCalled();
    });
    it('does nothing when disabled via system config', async () => {
      settings.isEnabled.mockResolvedValue(false);
      expect(await svc.refreshActiveProjects()).toBeNull();
    });
    it('force=true (admin trigger) bypasses the switches', async () => {
      env.ENABLE_SCHEDULER = 'false';
      expect(await svc.refreshActiveProjects(true)).toEqual({ projects: 2, refreshed: 2 });
    });
  });

  describe('flagExpiredSlas', () => {
    it('syncs SLA flags', async () => {
      await expect(svc.flagExpiredSlas()).resolves.toEqual({ flagged: 2, cleared: 1 });
    });
    it('respects the scheduler switch', async () => {
      env.ENABLE_SCHEDULER = 'false';
      expect(await svc.flagExpiredSlas()).toBeNull();
      expect(vendors.syncSlaFlags).not.toHaveBeenCalled();
    });
  });
});
