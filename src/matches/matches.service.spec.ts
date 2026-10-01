import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MatchesService, slaWeight } from './matches.service.js';

/** Minimal fluent QueryBuilder mock: every builder method returns itself. */
const qb = (result: unknown = undefined) => {
  const q: any = {};
  for (const m of [
    'where',
    'andWhere',
    'insert',
    'into',
    'values',
    'orUpdate',
    'delete',
    'from',
  ])
    q[m] = vi.fn(() => q);
  q.getMany = vi.fn(async () => result);
  q.execute = vi.fn(async () => result);
  return q;
};

const vendor = (
  id: number,
  name: string,
  servicesOffered: string[],
  rating: number,
  responseSlaHours: number,
) => ({
  id,
  name,
  servicesOffered,
  rating,
  responseSlaHours,
  countriesSupported: ['DE'],
  slaExpired: false,
});

const project = {
  id: 1,
  country: 'DE',
  servicesNeeded: ['legal', 'hr'],
  client: { contactEmail: 'founder@acme.io' },
} as any;

describe('slaWeight', () => {
  it.each([
    [1, 3],
    [12, 3],
    [13, 2],
    [24, 2],
    [25, 1],
    [48, 1],
    [49, 0],
    [200, 0],
  ])('%ih → %i', (hours, weight) => expect(slaWeight(hours)).toBe(weight));
});

describe('MatchesService.rebuildForProject', () => {
  let vendorsQb: any, insertQb: any, deleteQb: any;
  let matchesRepo: any,
    vendorsRepo: any,
    notifications: any,
    service: MatchesService;

  const setup = (
    candidates: any[],
    existingVendorIds: number[] = [],
    removed = 0,
  ) => {
    vendorsQb = qb(candidates);
    insertQb = qb({});
    deleteQb = qb({ affected: removed });
    vendorsRepo = { createQueryBuilder: vi.fn(() => vendorsQb) };
    matchesRepo = {
      find: vi.fn(async () =>
        existingVendorIds.map((vendorId) => ({ vendorId })),
      ),
      createQueryBuilder: vi
        .fn()
        .mockReturnValueOnce(insertQb)
        .mockReturnValueOnce(deleteQb),
    };
    notifications = { notifyNewMatch: vi.fn(async () => undefined) };
    service = new MatchesService(
      matchesRepo,
      vendorsRepo,
      {} as any,
      notifications,
    );
  };

  const v1 = vendor(
    1,
    'Berlin Partners',
    ['legal', 'hr', 'logistics'],
    4.5,
    12,
  ); // overlap 2 → 4 + 4.5 + 3 = 11.5
  const v2 = vendor(2, 'Alpine Advisory', ['legal', 'tax'], 4, 48); //               overlap 1 → 2 + 4 + 1 = 7

  beforeEach(() => setup([v2, v1]));

  it('scores with overlap*2 + rating + SLA weight and sorts best first', async () => {
    const res = await service.rebuildForProject(project);
    expect(res.matches).toEqual([
      {
        vendorId: 1,
        vendorName: 'Berlin Partners',
        servicesOverlap: 2,
        score: 11.5,
      },
      {
        vendorId: 2,
        vendorName: 'Alpine Advisory',
        servicesOverlap: 1,
        score: 7,
      },
    ]);
    expect(res.total).toBe(2);
  });

  it('queries MySQL for country + service overlap and skips SLA-expired vendors', async () => {
    await service.rebuildForProject(project);
    const clauses = [
      ...vendorsQb.where.mock.calls,
      ...vendorsQb.andWhere.mock.calls,
    ]
      .map((c) => c[0])
      .join(' ');
    expect(clauses).toContain('JSON_CONTAINS');
    expect(clauses).toContain('JSON_OVERLAPS');
    expect(clauses).toContain('slaExpired = false');
    expect(vendorsQb.where.mock.calls[0][1]).toEqual({ country: 'DE' });
  });

  it('upserts on the (project_id, vendor_id) unique key', async () => {
    await service.rebuildForProject(project);
    expect(insertQb.orUpdate).toHaveBeenCalledWith(
      ['score', 'updated_at'],
      ['project_id', 'vendor_id'],
    );
    const rows = insertQb.values.mock.calls[0][0];
    expect(rows.map((r: any) => [r.projectId, r.vendorId, r.score])).toEqual([
      [1, 2, 7],
      [1, 1, 11.5],
    ]);
  });

  it('notifies only for newly created matches (re-runs are quiet)', async () => {
    setup([v1, v2], [1]); // vendor 1 already matched
    const res = await service.rebuildForProject(project);
    expect(res.created).toBe(1);
    expect(notifications.notifyNewMatch).toHaveBeenCalledTimes(1);
    expect(notifications.notifyNewMatch).toHaveBeenCalledWith(
      'founder@acme.io',
      expect.objectContaining({ vendorName: 'Alpine Advisory' }),
    );

    setup([v1, v2], [1, 2]); // second run: nothing new
    const again = await service.rebuildForProject(project);
    expect(again.created).toBe(0);
    expect(notifications.notifyNewMatch).not.toHaveBeenCalled();
  });

  it('prunes vendors that no longer qualify', async () => {
    setup([v1], [1, 2], 1);
    const res = await service.rebuildForProject(project);
    expect(res.removed).toBe(1);
    expect(deleteQb.andWhere).toHaveBeenCalledWith(
      'vendor_id NOT IN (:...ids)',
      { ids: [1] },
    );
  });

  it('with no candidates: no insert, deletes all existing matches, no emails', async () => {
    setup([], [1, 2], 2);
    const res = await service.rebuildForProject(project);
    expect(res.total).toBe(0);
    expect(matchesRepo.createQueryBuilder).toHaveBeenCalledTimes(1); // only the delete builder
    expect(deleteQb.insert).not.toHaveBeenCalled();
    expect(deleteQb.andWhere).not.toHaveBeenCalled();
    expect(notifications.notifyNewMatch).not.toHaveBeenCalled();
  });

  it('does not fail the rebuild when an email fails', async () => {
    setup([v1]);
    notifications.notifyNewMatch.mockRejectedValue(new Error('smtp down'));
    await expect(service.rebuildForProject(project)).resolves.toMatchObject({
      total: 1,
      created: 1,
    });
  });
});
