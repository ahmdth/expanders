import { Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Can } from '@nestjs/authorization';
import { AdminPolicy } from '../policies/admin.policy.js';
import { SchedulerService } from './scheduler.service.js';

@ApiTags('System configs (admin)')
@ApiBearerAuth()
@Can(AdminPolicy, 'manage')
@Controller('admin/jobs')
export class SchedulerController {
  constructor(private jobs: SchedulerService) {}

  @Post('refresh-matches')
  @HttpCode(200)
  @ApiOperation({ summary: 'Run the daily match refresh now' })
  refresh() {
    return this.jobs.refreshActiveProjects(true);
  }

  @Post('flag-slas')
  @HttpCode(200)
  @ApiOperation({ summary: 'Run the SLA-expiry flagging now' })
  flag() {
    return this.jobs.flagExpiredSlas(true);
  }
}
