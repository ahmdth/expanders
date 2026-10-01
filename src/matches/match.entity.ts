import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity.js';
import { Vendor } from '../vendors/vendor.entity.js';
import { decimalTransformer } from '../common/transformers.js';

@Entity('matches')
@Index('uq_match_project_vendor', ['projectId', 'vendorId'], { unique: true })
export class Match {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'project_id' }) projectId: number;
  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project?: Project;
  @Column({ name: 'vendor_id' }) vendorId: number;
  @ManyToOne(() => Vendor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendor_id' })
  vendor?: Vendor;
  @Column({
    type: 'decimal',
    precision: 6,
    scale: 2,
    transformer: decimalTransformer,
  })
  score: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  /** Bumped every time a rebuild re-scores this pair; analytics use it for the "last 30 days" window. */
  @Index()
  @Column({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
