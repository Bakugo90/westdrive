import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { VehicleScheduleSlot } from '../fleet/entities/vehicle-schedule-slot.entity';
import {
  buildPaginatedResponse,
  resolvePagination,
  type PaginatedResponse,
} from '../shared/pagination/pagination.util';
import {
  Vehicle,
  VehicleOperationalStatus,
} from '../vehicles/entities/vehicle.entity';
import { CreateReservationEventDto } from './dto/create-reservation-event.dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { CreateStripePreauthDto } from './dto/create-stripe-preauth.dto';
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

const STATUS_EVENT_MAP: Record<ReservationStatus, string> = {
  [ReservationStatus.NOUVELLE_DEMANDE]: 'reservation_created',
  [ReservationStatus.EN_ANALYSE]: 'reservation_commercial_reviewed',
  [ReservationStatus.PROPOSITION_ENVOYEE]: 'reservation_counter_offer_sent',
  [ReservationStatus.EN_ATTENTE_PAIEMENT]: 'reservation_counter_offer_sent',
  [ReservationStatus.CONFIRMEE]: 'reservation_stripe_preauth_created',
  [ReservationStatus.EN_COURS]: 'reservation_vehicle_handover',
  [ReservationStatus.CLOTUREE]: 'reservation_closed',
  [ReservationStatus.ANNULEE]: 'reservation_closed',
  [ReservationStatus.REFUSEE]: 'reservation_closed',
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
    @InjectRepository(VehicleScheduleSlot)
    private readonly slotRepository: Repository<VehicleScheduleSlot>,
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

    await this.appendSystemEvent(
      savedReservation.id,
      'reservation_ack_email_sent',
      {
        channel: 'email',
      },
    );
    await this.appendSystemEvent(
      savedReservation.id,
      'reservation_admin_notified',
      {
        channel: 'internal',
      },
    );

    return this.findOne(savedReservation.id);
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Reservation>> {
    const pagination = resolvePagination(page, limit);
    const [items, totalItems] = await this.reservationRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { vehicle: true, user: true },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return buildPaginatedResponse(
      items,
      pagination.page,
      pagination.limit,
      totalItems,
    );
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

    await this.appendSystemEvent(reservation.id, 'reservation_status_changed', {
      status: dto.status,
    });

    await this.appendSystemEvent(
      reservation.id,
      STATUS_EVENT_MAP[dto.status] ?? 'reservation_status_changed',
      { status: dto.status },
    );

    return this.findOne(reservation.id);
  }

  async createStripePreauth(
    reservationId: string,
    dto: CreateStripePreauthDto,
  ): Promise<Reservation> {
    const reservation = await this.findOne(reservationId);

    if (reservation.status !== ReservationStatus.EN_ATTENTE_PAIEMENT) {
      throw new BadRequestException(
        'Stripe preauthorization is only allowed from EN_ATTENTE_PAIEMENT status',
      );
    }

    await this.appendSystemEvent(
      reservation.id,
      'reservation_stripe_preauth_created',
      {
        provider: 'STRIPE',
        amount: dto.amount ?? Number(reservation.depositAmount),
        currency: 'EUR',
        preauthStatus: 'AUTHORIZED',
      },
    );

    await this.reservationRepository.update(
      { id: reservation.id },
      { status: ReservationStatus.CONFIRMEE },
    );

    await this.appendSystemEvent(reservation.id, 'reservation_status_changed', {
      status: ReservationStatus.CONFIRMEE,
    });

    return this.findOne(reservation.id);
  }

  async createEvent(
    reservationId: string,
    dto: CreateReservationEventDto,
  ): Promise<ReservationEvent> {
    const reservation = await this.findOne(reservationId);

    // Operational timeline events can trigger safe status transitions automatically.
    if (dto.type === 'reservation_vehicle_handover') {
      if (reservation.status !== ReservationStatus.CONFIRMEE) {
        throw new BadRequestException(
          'Vehicle handover requires CONFIRMEE reservation status',
        );
      }
      reservation.status = ReservationStatus.EN_COURS;
      await this.reservationRepository.save(reservation);
      await this.appendSystemEvent(
        reservation.id,
        'reservation_status_changed',
        {
          status: reservation.status,
        },
      );
    }

    if (dto.type === 'reservation_closed') {
      if (reservation.status !== ReservationStatus.EN_COURS) {
        throw new BadRequestException(
          'Reservation can only be closed from EN_COURS status',
        );
      }
      reservation.status = ReservationStatus.CLOTUREE;
      await this.reservationRepository.save(reservation);
      await this.appendSystemEvent(
        reservation.id,
        'reservation_status_changed',
        {
          status: reservation.status,
        },
      );
    }

    const event = this.reservationEventRepository.create({
      reservationId,
      type: dto.type,
      occurredAt: dto.occurredAt ?? new Date(),
      payload: dto.payload ?? {},
    });

    return this.reservationEventRepository.save(event);
  }

  async findEvents(
    reservationId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<ReservationEvent>> {
    await this.findOne(reservationId);

    const pagination = resolvePagination(page, limit);

    const [items, totalItems] = await this.reservationEventRepository.findAndCount({
      where: { reservationId },
      order: { occurredAt: 'ASC' },
      skip: pagination.skip,
      take: pagination.limit,
    });

    return buildPaginatedResponse(
      items,
      pagination.page,
      pagination.limit,
      totalItems,
    );
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

    if (!vehicle.isActive) {
      throw new BadRequestException('Vehicle is inactive');
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
    const blockedSlotCount = await this.slotRepository
      .createQueryBuilder('slot')
      .where('slot.vehicle_id = :vehicleId', { vehicleId })
      .andWhere('(slot.start_at < :endAt) AND (slot.end_at > :startAt)', {
        startAt,
        endAt,
      })
      .getCount();

    if (blockedSlotCount > 0) {
      throw new ConflictException(
        'Vehicle is blocked by schedule slot for the selected range',
      );
    }

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

    if (startAt.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('startAt must be in the future');
    }
  }

  private generatePublicReference(): string {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `RES-${date}-${random}`;
  }

  private async appendSystemEvent(
    reservationId: string,
    type: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.reservationEventRepository.save(
      this.reservationEventRepository.create({
        reservationId,
        type,
        occurredAt: new Date(),
        payload,
      }),
    );
  }
}
