import { describe, expect, it, vi } from 'vitest';
import { AnalyticsService } from './analytics.service.js';

describe('AnalyticsService.topVendors', () => {
  it('joins MySQL rankings with MongoDB document counts per country', async () => {
    const ds = {
      query: vi
        .fn()
        // 1st query: ranked vendors (MySQL returns AVG/COUNT as strings)
        .mockResolvedValueOnce([
          { country: 'DE', vendorId: 1, vendorName: 'Berlin Partners', avgScore: '11.5000', matchCount: '3' },
          { country: 'DE', vendorId: 2, vendorName: 'Alpine Advisory', avgScore: '7.0000', matchCount: '1' },
          { country: 'EG', vendorId: 3, vendorName: 'Nile Gateway', avgScore: '9.2500', matchCount: '2' },
        ])
        // 2nd query: all projects in those countries
        .mockResolvedValueOnce([
          { id: 1, country: 'DE' }, { id: 2, country: 'DE' }, { id: 3, country: 'EG' }, { id: 4, country: 'EG' },
        ]),
    };
    const research = { countByProject: vi.fn(async () => new Map([[1, 3], [2, 1], [3, 5]])) };

    const res = await new AnalyticsService(ds as any, research as any).topVendors(30);

    expect(research.countByProject).toHaveBeenCalledWith([1, 2, 3, 4]);
    expect(res.windowDays).toBe(30);
    expect(res.countries).toEqual([
      {
        country: 'DE',
        researchDocumentCount: 4, // 3 + 1
        topVendors: [
          { vendorId: 1, name: 'Berlin Partners', avgMatchScore: 11.5, matchCount: 3 },
          { vendorId: 2, name: 'Alpine Advisory', avgMatchScore: 7, matchCount: 1 },
        ],
      },
      {
        country: 'EG',
        researchDocumentCount: 5, // project 4 has no docs → 0
        topVendors: [{ vendorId: 3, name: 'Nile Gateway', avgMatchScore: 9.25, matchCount: 2 }],
      },
    ]);
  });

  it('uses the requested look-back window', async () => {
    const ds = { query: vi.fn().mockResolvedValue([]) };
    const before = Date.now();
    await new AnalyticsService(ds as any, {} as any).topVendors(7);
    const since: Date = ds.query.mock.calls[0][1][0];
    expect(Math.round((before - since.getTime()) / 86_400_000)).toBe(7);
  });

  it('skips MongoDB entirely when there are no matches', async () => {
    const ds = { query: vi.fn().mockResolvedValue([]) };
    const research = { countByProject: vi.fn() };
    const res = await new AnalyticsService(ds as any, research as any).topVendors();
    expect(res).toEqual({ windowDays: 30, countries: [] });
    expect(research.countByProject).not.toHaveBeenCalled();
    expect(ds.query).toHaveBeenCalledTimes(1);
  });
});
