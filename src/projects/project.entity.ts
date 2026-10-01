import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Client } from '../clients/client.entity.js';
import { decimalTransformer } from '../common/transformers.js';

export enum ProjectStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn() id: number;
  @Index() @Column({ name: 'client_id' }) clientId: number;
  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;
  @Index() @Column() country: string;
  @Column({ name: 'services_needed', type: 'json' }) servicesNeeded: string[];
  @Column({ type: 'decimal', precision: 14, scale: 2, transformer: decimalTransformer }) budget: number;
  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.DRAFT }) status: ProjectStatus;
}
