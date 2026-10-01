import { Module } from '@nestjs/common';
import { ResearchModule } from '../research/research.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [ResearchModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
