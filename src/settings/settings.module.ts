import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { SystemConfig } from './system-config.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfig])],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
