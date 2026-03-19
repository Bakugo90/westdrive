import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import {
  Vehicle,
  VehicleOperationalStatus,
} from '../vehicles/entities/vehicle.entity';
import { CreateReservationEventDto } from './dto/create-reservation-event.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { UpdateReservationStatusDto } from './dto/update-reservation-status.dto';
import { ReservationEvent } from './entities/reservation-event.entity';
import { Reservation, ReservationStatus } from './entities/reservation.entity';

const BLOCKING_STATUSES: ReservationStatus[] = [
  ReservationStatus.NOUVELLE_DEMANDE,
  ReservationStatus.EN_ANALYSE,
  ReservationStatus.PROPOSITION_ENVOYEE,
  ReservationStatus.EN_ATTENTE_PAIEMENT,
  ReservationStatus.CONFIRMEE,
  ReservationStatus.EN_COURS,
];

const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  [ReservationStatus.NOUVELLE_DEMANDE]: [
    ReservationStatus.EN_ANALYSE,
    ReservationStatus.ANNULEE,
    ReservationStatus.REFUSEE,
  ],
  [ReservationStatus.EN_ANALYSE]: [
    ReservationStatus.PROPOSITION_ENVOYEE,
    ReservationStatus.REFUSEE,
    ReservationStatus.ANNULEE,
  ],
  [ReservationStatus.PROPOSITION_ENVOYEE]: [
    ReservationStatus.EN_ATTENTE_PAIEMENT,
    ReservationStatus.ANNULEE,
  ],
  [ReservationStatus.EN_ATTENTE_PAIEMENT]: [
    ReservationStatus.CONFIRMEE,
    ReservationStatus.ANNULEE,
  ],
  [ReservationStatus.CONFIRMEE]: [
    ReservationStatus.EN_COURS,
    ReservationStatus.ANNULEE,
  ],
  [ReservationStatus.EN_COURS]: [ReservationStatus.CLOTUREE],
  [ReservationStatus.CLOTUREE]: [],
  [ReservationStatus.ANNULEE]: [],
  [ReservationStatus.REFUSEE]: [],
};

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepository: Repository<Reservation>,
    @InjectRepository(ReservationEvent)
    private readonly reservationEventRepository: Repository<ReservationEvent>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async create(dto: CreateReservationDto): Promise<Reservation> {
    this.ensureDateRange(dto.startAt, dto.endAt);

    if (dto.vehicleId) {
      await this.ensureVehicleAssignable(dto.vehicleId);
      await this.ensureNoVehicleOverlap(dto.vehicleId, dto.startAt, dto.endAt);
    }

    const reservation = this.reservationRepository.create({
      ...dto,
      userId: dto.userId ?? null,
      vehicleId: dto.vehicleId ?? null,
      requesterEmail: dto.requesterEmail.toLowerCase(),
      companyName: dto.companyName ?? null,
      companySiret: dto.companySiret ?? null,
      amountTtc: (dto.amountTtc ?? 0).toFixed(2),
      depositAmount: (dto.depositAmount ?? 0).toFixed(2),
      publicReference: this.generatePublicReference(),
      status: ReservationStatus.NOUVELLE_DEMANDE,
    });

    const savedReservation = await this.reservationRepository.save(reservation);

    // First timeline event is always emitted at creation to anchor lifecycle tracking.
    await this.reservationEventRepository.save(
      this.reservationEventRepository.create({
        reservationId: savedReservation.id,
        type: 'reservation_created',
        occurredAt: new Date(),
        payload: {
          status: savedReservation.status,
          publicReference: savedReservation.publicReference,
        },
      }),
    );

    return this.findOne(savedReservation.id);
  }

  async findAll(): Promise<Reservation[]> {
    return this.reservationRepository.find({
      order: { createdAt: 'DESC' },
      relations: { vehicle: true, user: true },
    });
  }

  async findOne(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
      relations: { vehicle: true, user: true, events: true },
      order: { events: { occurredAt: 'ASC' } },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

  async update(id: string, dto: UpdateReservationDto): Promise<Reservation> {
    const reservation = await this.findOne(id);

    const nextStartAt = dto.startAt ?? reservation.startAt;
    const nextEndAt = dto.endAt ?? reservation.endAt;
    const nextVehicleId = dto.vehicleId ?? reservation.vehicleId;

    this.ensureDateRange(nextStartAt, nextEndAt);

    if (dto.vehicleId !== undefined && dto.vehicleId !== null) {
      await this.ensureVehicleAssignable(dto.vehicleId);
    }

    if (nextVehicleId) {
      await this.ensureNoVehicleOverlap(
        nextVehicleId,
        nextStartAt,
        nextEndAt,
        reservation.id,
      );
    }

    Object.assign(reservation, {
      ...dto,
      userId: dto.userId ?? reservation.userId,
      vehicleId: dto.vehicleId ?? reservation.vehicleId,
      requesterEmail:
        dto.requesterEmail?.toLowerCase() ?? reservation.requesterEmail,
      companyName: dto.companyName ?? reservation.companyName,
      companySiret: dto.companySiret ?? reservation.companySiret,
      amountTtc:
        dto.amountTtc !== undefined
          ? dto.amountTtc.toFixed(2)
          : reservation.amountTtc,
      depositAmount:
        dto.depositAmount !== undefined
          ? dto.depositAmount.toFixed(2)
          : reservation.depositAmount,
    });

    await this.reservationRepository.save(reservation);

    await this.reservationEventRepository.save(
      this.reservationEventRepository.create({
        reservationId: reservation.id,
        type: 'reservation_updated',
        occurredAt: new Date(),
        payload: {
          hasDateChange:
            dto.startAt !== undefined ||
            dto.endAt !== undefined ||
            dto.vehicleId !== undefined,
        },
      }),
    );

    return this.findOne(reservation.id);
  }

  async updateStatus(
    id: string,
    dto: UpdateReservationStatusDto,
  ): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.status === dto.status) {
      return reservation;
    }

    const allowedStatuses = ALLOWED_TRANSITIONS[reservation.status] ?? [];
    if (!allowedStatuses.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${reservation.status} to ${dto.status}`,
      );
    }

    reservation.status = dto.status;
    await this.reservationRepository.save(reservation);

    await this.reservationEventRepository.save(
      this.reservationEventRepository.create({
        reservationId: reservation.id,
        type: 'reservation_status_changed',
        occurredAt: new Date(),
        payload: { status: dto.status },
      }),
    );

    return this.findOne(reservation.id);
  }

  async createEvent(
    reservationId: string,
    dto: CreateReservationEventDto,
  ): Promise<ReservationEvent> {
    await this.findOne(reservationId);

    const event = this.reservationEventRepository.create({
      reservationId,
      type: dto.type,
      occurredAt: dto.occurredAt ?? new Date(),
      payload: dto.payload ?? {},
    });

    return this.reservationEventRepository.save(event);
  }

  async findEvents(reservationId: string): Promise<ReservationEvent[]> {
    await this.findOne(reservationId);

    return this.reservationEventRepository.find({
      where: { reservationId },
      order: { occurredAt: 'ASC' },
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    const reservation = await this.reservationRepository.findOne({
      where: { id },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    await this.reservationRepository.delete({ id });

    return { message: 'Reservation deleted successfully' };
  }

  private async ensureVehicleAssignable(vehicleId: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Maintenance or blocked vehicles cannot be used for new bookings.
    if (
      vehicle.operationalStatus === VehicleOperationalStatus.INDISPONIBLE ||
      vehicle.operationalStatus === VehicleOperationalStatus.MAINTENANCE
    ) {
      throw new BadRequestException(
        'Vehicle is not assignable in current status',
      );
    }
  }

  private async ensureNoVehicleOverlap(
    vehicleId: string,
    startAt: Date,
    endAt: Date,
    excludedReservationId?: string,
  ): Promise<void> {
    const conflictingCount = await this.reservationRepository.count({
      where: {
        vehicleId,
        status: In(BLOCKING_STATUSES),
        id: excludedReservationId ? Not(excludedReservationId) : undefined,
      },
    });

    if (!conflictingCount) {
      return;
    }

    const conflicts = await this.reservationRepository
      .createQueryBuilder('reservation')
      .where('reservation.vehicle_id = :vehicleId', { vehicleId })
      .andWhere('reservation.status IN (:...blockingStatuses)', {
        blockingStatuses: BLOCKING_STATUSES,
      })
      .andWhere(
        '(reservation.start_at < :endAt) AND (reservation.end_at > :startAt)',
        {
          startAt,
          endAt,
        },
      )
      .andWhere(
        excludedReservationId
          ? 'reservation.id != :excludedReservationId'
          : '1=1',
        { excludedReservationId },
      )
      .getCount();

    if (conflicts > 0) {
      throw new ConflictException(
        'Vehicle already has an overlapping reservation for this time range',
      );
    }
  }

  private ensureDateRange(startAt: Date, endAt: Date): void {
    if (startAt >= endAt) {
      throw new BadRequestException('startAt must be before endAt');
    }
  }

  private generatePublicReference(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `RES-${date}-${random}`;
  }
}
