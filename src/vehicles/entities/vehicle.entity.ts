import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { VehicleImage } from './vehicle-image.entity';

export enum VehicleOperationalStatus {
  DISPONIBLE = 'DISPONIBLE',
  INDISPONIBLE = 'INDISPONIBLE',
  MAINTENANCE = 'MAINTENANCE',
}

@Entity('vehicles')
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  brand!: string;

  @Column({ type: 'varchar' })
  model!: string;

  @Column({ type: 'int' })
  year!: number;

  @Column({ type: 'varchar' })
  category!: string;

  @Column({ type: 'varchar' })
  transmission!: string;

  @Column({ type: 'varchar' })
  energy!: string;

  @Column({ type: 'int' })
  seats!: number;

  @Column({ type: 'int', name: 'included_km_per_day' })
  includedKmPerDay!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_day' })
  pricePerDay!: string;

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating!: string;

  @Column({ type: 'int', name: 'review_count', default: 0 })
  reviewCount!: number;

  @Column({
    type: 'enum',
    enum: VehicleOperationalStatus,
    name: 'operational_status',
    default: VehicleOperationalStatus.DISPONIBLE,
  })
  operationalStatus!: VehicleOperationalStatus;

  @Column({
    type: 'jsonb',
    name: 'available_cities',
    default: () => "'[]'::jsonb",
  })
  availableCities!: string[];

  @Column({ type: 'varchar', name: 'street_address' })
  streetAddress!: string;

  @Column({ type: 'varchar' })
  city!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude!: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => VehicleImage, (image) => image.vehicle, { cascade: true })
  images!: VehicleImage[];
}
