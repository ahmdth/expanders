import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '../common/role.enum.js';
import { Client } from '../clients/client.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn() id: number;
  @Column({ unique: true }) email: string;
  @Column({ name: 'password_hash' }) passwordHash: string;
  @Column({ type: 'enum', enum: Role, default: Role.CLIENT }) role: Role;
  @Column({ name: 'client_id', type: 'int', nullable: true }) clientId:
    number | null;
  @ManyToOne(() => Client, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client?: Client;
}
