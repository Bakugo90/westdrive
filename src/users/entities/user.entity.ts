import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
}
