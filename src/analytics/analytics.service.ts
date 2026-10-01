import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ResearchService } from '../research/research.service.js';

interface TopVendorRow {
  country: string;
  vendorId: number;
  vendorName: string;
  avgScore: string;
  matchCount: string;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectDataSource() private ds: DataSource,
    private research: ResearchService,
  ) {}

  async topVendors(days = 30) {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000);

    // MySQL: top 3 vendors per country by avg match score in the window
    const rows: TopVendorRow[] = await this.ds.query(
      `SELECT country, vendor_id AS vendorId, vendor_name AS vendorName, avg_score AS avgScore, match_count AS matchCount
       FROM (
         SELECT p.country AS country, v.id AS vendor_id, v.name AS vendor_name,
                AVG(m.score) AS avg_score, COUNT(*) AS match_count,
                ROW_NUMBER() OVER (PARTITION BY p.country ORDER BY AVG(m.score) DESC, COUNT(*) DESC, v.id) AS rnk
         FROM matches m
         JOIN projects p ON p.id = m.project_id
         JOIN vendors v ON v.id = m.vendor_id
         WHERE m.updated_at >= ?
         GROUP BY p.country, v.id, v.name
       ) ranked
       WHERE rnk <= 3
       ORDER BY country, avgScore DESC`,
      [since],
    );
    const countries = [...new Set(rows.map((r) => r.country))];
    if (!countries.length) return { windowDays: days, countries: [] };

    // MySQL: every project in those countries → MongoDB: count documents per project → roll up per country
    const projects: { id: number; country: string }[] = await this.ds.query(
      `SELECT id, country FROM projects WHERE country IN (?)`,
      [countries],
    );
    const docsByProject = await this.research.countByProject(
      projects.map((p) => p.id),
    );
    const docsByCountry = new Map<string, number>();
    for (const p of projects) {
      docsByCountry.set(
        p.country,
        (docsByCountry.get(p.country) ?? 0) + (docsByProject.get(p.id) ?? 0),
      );
    }

    return {
      windowDays: days,
      countries: countries.map((country) => ({
        country,
        researchDocumentCount: docsByCountry.get(country) ?? 0,
        topVendors: rows
          .filter((r) => r.country === country)
          .map((r) => ({
            vendorId: r.vendorId,
            name: r.vendorName,
            avgMatchScore: Number(Number(r.avgScore).toFixed(2)),
            matchCount: Number(r.matchCount),
          })),
      })),
    };
  }
}
