import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Can } from '@nestjs/authorization';
import { AdminPolicy } from '../policies/admin.policy.js';
import { SettingsService } from './settings.service.js';

class SetConfigDto {
  @ApiProperty({ example: 'false' }) @IsString() value: string;
}

@ApiTags('System configs (admin)')
@ApiBearerAuth()
@Can(AdminPolicy, 'manage')
@Controller('admin/configs')
export class SettingsController {
  constructor(private settings: SettingsService) {}
  @Get() all() { return this.settings.all(); }
  @Put(':key') set(@Param('key') key: string, @Body() dto: SetConfigDto) { return this.settings.set(key, dto.value); }
}
