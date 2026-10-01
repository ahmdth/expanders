import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('system_configs')
export class SystemConfig {
  @PrimaryColumn({ name: 'config_key' }) key: string;
  @Column({ type: 'text' }) value: string;
}
