import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  resolvePagination,
  type PaginatedResponse,
} from '../shared/pagination/pagination.util';
import {
  Vehicle,
  VehicleOperationalStatus,
} from '../vehicles/entities/vehicle.entity';
import { CreateFleetIncidentDto } from './dto/create-fleet-incident.dto';
import { CreateVehicleScheduleSlotDto } from './dto/create-vehicle-schedule-slot.dto';
import { UpdateFleetIncidentDto } from './dto/update-fleet-incident.dto';
import { UpdateFleetVehicleStatusDto } from './dto/update-fleet-vehicle-status.dto';
import { UpdateVehicleScheduleSlotDto } from './dto/update-vehicle-schedule-slot.dto';
import {
  FleetIncident,
  FleetIncidentSeverity,
  FleetIncidentStatus,
} from './entities/fleet-incident.entity';
import { VehicleScheduleSlot } from './entities/vehicle-schedule-slot.entity';

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(FleetIncident)
    private readonly incidentRepository: Repository<FleetIncident>,
    @InjectRepository(VehicleScheduleSlot)
    private readonly slotRepository: Repository<VehicleScheduleSlot>,
  ) {}

  async getOverview() {
    const [bonEtat, entretienRequis, enPanne, totalIncidentsOuverts] =
      await Promise.all([
        this.vehicleRepository.count({
          where: { operationalStatus: VehicleOperationalStatus.DISPONIBLE },
        }),
        this.vehicleRepository.count({
          where: { operationalStatus: VehicleOperationalStatus.MAINTENANCE },
        }),
        this.vehicleRepository.count({
          where: { operationalStatus: VehicleOperationalStatus.INDISPONIBLE },
        }),
        this.incidentRepository.count({
          where: [
            { status: FleetIncidentStatus.OUVERT },
            { status: FleetIncidentStatus.EN_COURS },
          ],
        }),
      ]);

    return {
      bonEtat,
      entretienRequis,
      enPanne,
      totalIncidentsOuverts,
    };
  }

  async listFleetVehicles(
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Vehicle>> {
    const pagination = resolvePagination(page, limit);
    const [items, totalItems] = await this.vehicleRepository.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { images: true },
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

  async updateVehicleStatus(
    vehicleId: string,
    dto: UpdateFleetVehicleStatusDto,
  ): Promise<Vehicle> {
    const vehicle = await this.findVehicleOrFail(vehicleId);

    vehicle.operationalStatus = dto.operationalStatus;
    return this.vehicleRepository.save(vehicle);
  }

  async createIncident(dto: CreateFleetIncidentDto): Promise<FleetIncident> {
    const vehicle = await this.findVehicleOrFail(dto.vehicleId);

    const incident = this.incidentRepository.create({
      vehicleId: dto.vehicleId,
      incidentType: dto.incidentType,
      severity: dto.severity,
      status: dto.status ?? FleetIncidentStatus.OUVERT,
      description: dto.description,
      openedAt: dto.openedAt ?? new Date(),
      resolvedAt: dto.resolvedAt ?? null,
    });

    const savedIncident = await this.incidentRepository.save(incident);

    // Critical incidents immediately block vehicle assignment to avoid unsafe bookings.
    if (savedIncident.severity === FleetIncidentSeverity.CRITIQUE) {
      vehicle.operationalStatus = VehicleOperationalStatus.INDISPONIBLE;
      await this.vehicleRepository.save(vehicle);
    }

    return this.getIncidentById(savedIncident.id);
  }

  async listIncidents(
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<FleetIncident>> {
    const pagination = resolvePagination(page, limit);
    const [items, totalItems] = await this.incidentRepository.findAndCount({
      order: { openedAt: 'DESC' },
      relations: { vehicle: true },
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

  async getIncidentById(incidentId: string): Promise<FleetIncident> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
      relations: { vehicle: true },
    });

    if (!incident) {
      throw new NotFoundException('Fleet incident not found');
    }

    return incident;
  }

  async updateIncident(
    incidentId: string,
    dto: UpdateFleetIncidentDto,
  ): Promise<FleetIncident> {
    const incident = await this.getIncidentById(incidentId);

    if (dto.vehicleId !== undefined) {
      await this.findVehicleOrFail(dto.vehicleId);
      incident.vehicleId = dto.vehicleId;
    }
    // The frontend relies on explicit status transitions to track lifecycle clearly.
    if (dto.incidentType !== undefined) {
      incident.incidentType = dto.incidentType;
    }
    if (dto.severity !== undefined) {
      incident.severity = dto.severity;
    }
    if (dto.status !== undefined) {
      incident.status = dto.status;
    }
    if (dto.description !== undefined) {
      incident.description = dto.description;
    }
    if (dto.openedAt !== undefined) {
      incident.openedAt = dto.openedAt;
    }
    if (dto.resolvedAt !== undefined) {
      incident.resolvedAt = dto.resolvedAt;
    }

    const savedIncident = await this.incidentRepository.save(incident);

    // Preserve hard safety rule: any critical unresolved incident keeps vehicle unavailable.
    if (
      savedIncident.severity === FleetIncidentSeverity.CRITIQUE &&
      savedIncident.status !== FleetIncidentStatus.RESOLU
    ) {
      const vehicle = await this.findVehicleOrFail(savedIncident.vehicleId);
      vehicle.operationalStatus = VehicleOperationalStatus.INDISPONIBLE;
      await this.vehicleRepository.save(vehicle);
    }

    return this.getIncidentById(savedIncident.id);
  }

  async removeIncident(incidentId: string): Promise<{ message: string }> {
    const incident = await this.incidentRepository.findOne({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException('Fleet incident not found');
    }

    await this.incidentRepository.delete({ id: incidentId });
    return { message: 'Fleet incident deleted successfully' };
  }

  async createScheduleSlot(
    dto: CreateVehicleScheduleSlotDto,
  ): Promise<VehicleScheduleSlot> {
    await this.findVehicleOrFail(dto.vehicleId);

    this.ensureValidSlotRange(dto.startAt, dto.endAt);

    const slot = this.slotRepository.create({
      vehicleId: dto.vehicleId,
      startAt: dto.startAt,
      endAt: dto.endAt,
      slotType: dto.slotType,
    });

    return this.slotRepository.save(slot);
  }

  async listScheduleSlots(
    vehicleId?: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<VehicleScheduleSlot>> {
    const pagination = resolvePagination(page, limit);
    const [items, totalItems] = await this.slotRepository.findAndCount({
      where: vehicleId ? { vehicleId } : {},
      order: { startAt: 'ASC' },
      relations: { vehicle: true },
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

  async getScheduleSlotById(slotId: string): Promise<VehicleScheduleSlot> {
    const slot = await this.slotRepository.findOne({
      where: { id: slotId },
      relations: { vehicle: true },
    });

    if (!slot) {
      throw new NotFoundException('Vehicle schedule slot not found');
    }

    return slot;
  }

  async updateScheduleSlot(
    slotId: string,
    dto: UpdateVehicleScheduleSlotDto,
  ): Promise<VehicleScheduleSlot> {
    const slot = await this.getScheduleSlotById(slotId);

    if (dto.vehicleId !== undefined) {
      await this.findVehicleOrFail(dto.vehicleId);
      slot.vehicleId = dto.vehicleId;
    }
    if (dto.startAt !== undefined) {
      slot.startAt = dto.startAt;
    }
    if (dto.endAt !== undefined) {
      slot.endAt = dto.endAt;
    }
    if (dto.slotType !== undefined) {
      slot.slotType = dto.slotType;
    }

    this.ensureValidSlotRange(slot.startAt, slot.endAt);

    await this.slotRepository.save(slot);
    return this.getScheduleSlotById(slot.id);
  }

  async removeScheduleSlot(slotId: string): Promise<{ message: string }> {
    const slot = await this.slotRepository.findOne({ where: { id: slotId } });
    if (!slot) {
      throw new NotFoundException('Vehicle schedule slot not found');
    }

    await this.slotRepository.delete({ id: slotId });
    return { message: 'Vehicle schedule slot deleted successfully' };
  }

  private async findVehicleOrFail(vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  private ensureValidSlotRange(startAt: Date, endAt: Date): void {
    if (startAt >= endAt) {
      throw new BadRequestException('startAt must be before endAt');
    }
  }
}
