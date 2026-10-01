import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn() id: number;
  @Column({ name: 'company_name' }) companyName: string;
  @Column({ name: 'contact_email' }) contactEmail: string;
}
