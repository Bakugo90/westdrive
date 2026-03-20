import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CompanyProfile } from './company-profile.entity';
import { UserRole } from '../../iam/entities/user-role.entity';

export enum UserStatus {
  ACTIF = 'ACTIF',
  SUSPENDU = 'SUSPENDU',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', unique: true })
  email!: string;

  @Column({ type: 'varchar', name: 'password_hash' })
  passwordHash!: string;

  @Column({ type: 'varchar', name: 'first_name' })
  firstName!: string;

  @Column({ type: 'varchar', name: 'last_name' })
  lastName!: string;

  @Column({ type: 'varchar' })
  phone!: string;

  @Column({ type: 'varchar' })
  role!: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIF,
  })
  status!: UserStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles!: UserRole[];

  @OneToOne(() => CompanyProfile, (companyProfile) => companyProfile.user, {
    cascade: true,
    nullable: true,
  })
  companyProfile!: CompanyProfile | null;
}
