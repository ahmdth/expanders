import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthUser } from '../common/auth-user.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Project } from '../projects/project.entity.js';
import { ProjectsService } from '../projects/projects.service.js';
import { Vendor } from '../vendors/vendor.entity.js';
import { Match } from './match.entity.js';

/** Faster responders score higher: <=12h → 3, <=24h → 2, <=48h → 1, otherwise 0. */
export const slaWeight = (hours: number) => (hours <= 12 ? 3 : hours <= 24 ? 2 : hours <= 48 ? 1 : 0);

@Injectable()
export class MatchesService {
  private readonly logger = new Logger(MatchesService.name);

  constructor(
    @InjectRepository(Match) private matches: Repository<Match>,
    @InjectRepository(Vendor) private vendors: Repository<Vendor>,
    private projects: ProjectsService,
    private notifications: NotificationsService,
  ) {}

  async rebuildForUser(user: AuthUser, projectId: number) {
    const project = await this.projects.findOneAuthorized(user, projectId);
    return this.rebuildForProject(project);
  }

  /**
   * Rules: vendor covers the project's country AND shares >= 1 service.
   * Score = services_overlap * 2 + rating + SLA_weight.
   * Idempotent: (project_id, vendor_id) is unique and written with INSERT … ON DUPLICATE KEY UPDATE,
   * so running it N times yields the same rows. Vendors that stopped qualifying are removed.
   */
  async rebuildForProject(project: Project) {
    // 1. Candidate selection in MySQL (JSON_CONTAINS for country, JSON_OVERLAPS for services)
    const candidates = await this.vendors
      .createQueryBuilder('v')
      .where('JSON_CONTAINS(v.countriesSupported, JSON_QUOTE(:country))', { country: project.country })
      .andWhere('JSON_OVERLAPS(v.servicesOffered, CAST(:services AS JSON))', {
        services: JSON.stringify(project.servicesNeeded),
      })
      .andWhere('v.slaExpired = false')
      .getMany();

    // 2. Scoring
    const needed = new Set(project.servicesNeeded);
    const scored = candidates.map((v) => {
      const servicesOverlap = v.servicesOffered.filter((s) => needed.has(s)).length;
      const score = Number((servicesOverlap * 2 + Number(v.rating) + slaWeight(v.responseSlaHours)).toFixed(2));
      return { vendor: v, servicesOverlap, score };
    });

    // 3. Idempotent upsert + prune stale matches
    const before = new Set((await this.matches.find({ where: { projectId: project.id } })).map((m) => m.vendorId));
    const now = new Date();
    if (scored.length) {
      await this.matches
        .createQueryBuilder()
        .insert()
        .into(Match)
        .values(scored.map((s) => ({ projectId: project.id, vendorId: s.vendor.id, score: s.score, updatedAt: now })))
        .orUpdate(['score', 'updated_at'], ['project_id', 'vendor_id'])
        .execute();
    }
    const qb = this.matches.createQueryBuilder().delete().where('project_id = :pid', { pid: project.id });
    if (scored.length) qb.andWhere('vendor_id NOT IN (:...ids)', { ids: scored.map((s) => s.vendor.id) });
    const removed = (await qb.execute()).affected ?? 0;

    // 4. Notify only for pairs that did not exist before
    const fresh = scored.filter((s) => !before.has(s.vendor.id));
    const to = project.client?.contactEmail;
    if (to && fresh.length) {
      await Promise.allSettled(
        fresh.map((s) =>
          this.notifications.notifyNewMatch(to, {
            projectId: project.id,
            country: project.country,
            vendorName: s.vendor.name,
            score: s.score,
          }),
        ),
      );
    }

    this.logger.log(`Project ${project.id}: ${scored.length} matches (${fresh.length} new, ${removed} removed)`);
    return {
      projectId: project.id,
      total: scored.length,
      created: fresh.length,
      removed,
      matches: scored
        .sort((a, b) => b.score - a.score)
        .map((s) => ({ vendorId: s.vendor.id, vendorName: s.vendor.name, servicesOverlap: s.servicesOverlap, score: s.score })),
    };
  }

  async list(user: AuthUser, projectId: number) {
    await this.projects.findOneAuthorized(user, projectId);
    return this.matches.find({ where: { projectId }, relations: { vendor: true }, order: { score: 'DESC' } });
  }
}
