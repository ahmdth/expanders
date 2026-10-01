import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { Vendor } from '../vendors/vendor.entity.js';
import { Match } from './match.entity.js';
import { MatchesController } from './matches.controller.js';
import { MatchesService } from './matches.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, Vendor]),
    ProjectsModule,
    NotificationsModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
