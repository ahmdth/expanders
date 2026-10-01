import { Module } from '@nestjs/common';
import { MatchesModule } from '../matches/matches.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { VendorsModule } from '../vendors/vendors.module.js';
import { SchedulerController } from './scheduler.controller.js';
import { SchedulerService } from './scheduler.service.js';

@Module({
  imports: [MatchesModule, ProjectsModule, SettingsModule, VendorsModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
})
export class SchedulerModule {}
