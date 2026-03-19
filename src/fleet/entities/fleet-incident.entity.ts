import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Vehicle } from '../../vehicles/entities/vehicle.entity';

export enum FleetIncidentType {
  DOMMAGE = 'DOMMAGE',
  PANNE = 'PANNE',
  HISTORIQUE = 'HISTORIQUE',
}

export enum FleetIncidentSeverity {
  MINEUR = 'MINEUR',
  MAJEUR = 'MAJEUR',
  CRITIQUE = 'CRITIQUE',
}

export enum FleetIncidentStatus {
  OUVERT = 'OUVERT',
  EN_COURS = 'EN_COURS',
  RESOLU = 'RESOLU',
}

@Entity('fleet_incidents')
export class FleetIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'vehicle_id' })
  vehicleId!: string;

  @ManyToOne(() => Vehicle, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle!: Vehicle;

  @Column({
    type: 'enum',
    enum: FleetIncidentType,
    name: 'incident_type',
  })
  incidentType!: FleetIncidentType;

  @Column({
    type: 'enum',
    enum: FleetIncidentSeverity,
  })
  severity!: FleetIncidentSeverity;

  @Column({
    type: 'enum',
    enum: FleetIncidentStatus,
    default: FleetIncidentStatus.OUVERT,
  })
  status!: FleetIncidentStatus;

  @Column({ type: 'varchar' })
  description!: string;

  @Column({ type: 'timestamptz', name: 'opened_at' })
  openedAt!: Date;

  @Column({ type: 'timestamptz', name: 'resolved_at', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
