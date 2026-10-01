import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { MatchesService } from '../matches/matches.service.js';
import { ProjectsService } from '../projects/projects.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { VendorsService } from '../vendors/vendors.service.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private config: ConfigService,
    private settings: SettingsService,
    private projects: ProjectsService,
    private matches: MatchesService,
    private vendors: VendorsService,
  ) {}

  private get enabled() {
    return this.config.get('ENABLE_SCHEDULER') !== 'false';
  }

  /** 01:00 — flag first, so the 02:00 refresh already excludes expired vendors. */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async flagExpiredSlas(force = false) {
    if (!force && (!this.enabled || !(await this.settings.isEnabled('matching.sla_flagging_enabled')))) return null;
    const result = await this.vendors.syncSlaFlags();
    this.logger.log(`SLA sync: ${result.flagged} flagged, ${result.cleared} cleared`);
    return result;
  }

  /** 02:00 — refresh matches for every active project. */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async refreshActiveProjects(force = false) {
    if (!force && (!this.enabled || !(await this.settings.isEnabled('matching.daily_refresh_enabled')))) return null;
    const active = await this.projects.findActive();
    let ok = 0;
    for (const project of active) {
      try {
        await this.matches.rebuildForProject(project);
        ok++;
      } catch (e) {
        this.logger.error(`Refresh failed for project ${project.id}: ${(e as Error).message}`);
      }
    }
    this.logger.log(`Daily refresh: ${ok}/${active.length} active projects`);
    return { projects: active.length, refreshed: ok };
  }
}
