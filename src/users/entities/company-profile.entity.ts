import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('company_profiles')
export class CompanyProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.companyProfile, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'varchar', name: 'company_name' })
  companyName!: string;

  @Column({ type: 'varchar' })
  siret!: string;

  @Column({ type: 'varchar', name: 'contact_name' })
  contactName!: string;

  @Column({ type: 'varchar', name: 'contact_email' })
  contactEmail!: string;

  @Column({ type: 'varchar', name: 'contact_phone' })
  contactPhone!: string;
}
