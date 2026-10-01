import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './system-config.entity.js';

/** Known keys and their defaults. */
export const CONFIG_DEFAULTS: Record<string, string> = {
  'matching.daily_refresh_enabled': 'true',
  'matching.sla_flagging_enabled': 'true',
};

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemConfig) private repo: Repository<SystemConfig>,
  ) {}

  async all() {
    const rows = await this.repo.find();
    return {
      ...CONFIG_DEFAULTS,
      ...Object.fromEntries(rows.map((r) => [r.key, r.value])),
    };
  }
  async get(key: string) {
    return (
      (await this.repo.findOne({ where: { key } }))?.value ??
      CONFIG_DEFAULTS[key]
    );
  }
  async isEnabled(key: string) {
    return (await this.get(key)) !== 'false';
  }
  async set(key: string, value: string) {
    await this.repo.save({ key, value });
    return { key, value };
  }
}
