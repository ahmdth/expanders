import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { decimalTransformer } from '../common/transformers.js';

@Entity('vendors')
export class Vendor {
  @PrimaryGeneratedColumn() id: number;
  @Column() name: string;
  @Column({ name: 'countries_supported', type: 'json' }) countriesSupported: string[];
  @Column({ name: 'services_offered', type: 'json' }) servicesOffered: string[];
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0, transformer: decimalTransformer }) rating: number;
  @Column({ name: 'response_sla_hours', type: 'int' }) responseSlaHours: number;
  /** When the vendor's SLA agreement lapses. The daily job sets `slaExpired` once this is in the past. */
  @Column({ name: 'sla_expires_at', type: 'datetime', nullable: true }) slaExpiresAt: Date | null;
  @Column({ name: 'sla_expired', default: false }) slaExpired: boolean;
}
