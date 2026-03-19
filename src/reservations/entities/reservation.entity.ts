import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';
import { ReservationEvent } from './reservation-event.entity';

export enum ReservationStatus {
  NOUVELLE_DEMANDE = 'NOUVELLE_DEMANDE',
  EN_ANALYSE = 'EN_ANALYSE',
  PROPOSITION_ENVOYEE = 'PROPOSITION_ENVOYEE',
  EN_ATTENTE_PAIEMENT = 'EN_ATTENTE_PAIEMENT',
  CONFIRMEE = 'CONFIRMEE',
  EN_COURS = 'EN_COURS',
  CLOTUREE = 'CLOTUREE',
  ANNULEE = 'ANNULEE',
  REFUSEE = 'REFUSEE',
}

@Entity('reservations')
export class Reservation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'user_id', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @Column({ type: 'uuid', name: 'vehicle_id', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => Vehicle, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle | null;

  @Column({ type: 'varchar', name: 'requester_type' })
  requesterType!: string;

  @Column({ type: 'varchar', name: 'requester_name' })
  requesterName!: string;

  @Column({ type: 'varchar', name: 'requester_email' })
  requesterEmail!: string;

  @Column({ type: 'varchar', name: 'requester_phone' })
  requesterPhone!: string;

  @Column({ type: 'varchar', name: 'company_name', nullable: true })
  companyName!: string | null;

  @Column({ type: 'varchar', name: 'company_siret', nullable: true })
  companySiret!: string | null;

  @Column({ type: 'timestamptz', name: 'start_at' })
  startAt!: Date;

  @Column({ type: 'timestamptz', name: 'end_at' })
  endAt!: Date;

  @Column({ type: 'varchar', name: 'pickup_city' })
  pickupCity!: string;

  @Column({ type: 'varchar', name: 'requested_vehicle_type' })
  requestedVehicleType!: string;

  @Column({ type: 'varchar', name: 'public_reference', unique: true })
  publicReference!: string;

  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.NOUVELLE_DEMANDE,
  })
  status!: ReservationStatus;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'amount_ttc',
    default: 0,
  })
  amountTtc!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'deposit_amount',
    default: 0,
  })
  depositAmount!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => ReservationEvent, (event) => event.reservation, {
    cascade: true,
  })
  events!: ReservationEvent[];
}
