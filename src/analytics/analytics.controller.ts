import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Can } from '@nestjs/authorization';
import { AdminPolicy } from '../policies/admin.policy.js';
import { AnalyticsService } from './analytics.service.js';

class TopVendorsQuery {
  @ApiPropertyOptional({ default: 30, description: 'Look-back window in days' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}

@ApiTags('Analytics')
@ApiBearerAuth()
@Can(AdminPolicy, 'manage')
@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('top-vendors')
  @ApiOperation({
    summary:
      'Top 3 vendors per country (MySQL) + research doc counts per country (MongoDB)',
  })
  topVendors(@Query() q: TopVendorsQuery) {
    return this.analytics.topVendors(q.days ?? 30);
  }
}
