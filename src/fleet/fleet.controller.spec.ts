import { Test, TestingModule } from '@nestjs/testing';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import {
  FleetIncidentSeverity,
  FleetIncidentType,
} from './entities/fleet-incident.entity';
import { VehicleOperationalStatus } from '../vehicles/entities/vehicle.entity';

describe('FleetController', () => {
  let controller: FleetController;

  const fleetServiceMock = {
    getOverview: jest.fn(),
    listFleetVehicles: jest.fn(),
    updateVehicleStatus: jest.fn(),
    createIncident: jest.fn(),
    listIncidents: jest.fn(),
    getIncidentById: jest.fn(),
    updateIncident: jest.fn(),
    removeIncident: jest.fn(),
    createScheduleSlot: jest.fn(),
    listScheduleSlots: jest.fn(),
    getScheduleSlotById: jest.fn(),
    updateScheduleSlot: jest.fn(),
    removeScheduleSlot: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FleetController],
      providers: [
        {
          provide: FleetService,
          useValue: fleetServiceMock,
        },
      ],
    }).compile();

    controller = module.get<FleetController>(FleetController);
  });

  it('GET /fleet/overview calls getOverview', async () => {
    const expected = { bonEtat: 3, entretienRequis: 1, enPanne: 1 };
    fleetServiceMock.getOverview.mockResolvedValue(expected);

    await expect(controller.getOverview()).resolves.toEqual(expected);
  });

  it('PATCH /fleet/vehicles/:vehicleId/status calls updateVehicleStatus', async () => {
    const vehicleId = '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688';
    const dto = { operationalStatus: VehicleOperationalStatus.INDISPONIBLE };
    const expected = {
      id: vehicleId,
      operationalStatus: dto.operationalStatus,
    };
    fleetServiceMock.updateVehicleStatus.mockResolvedValue(expected);

    await expect(
      controller.updateVehicleStatus(vehicleId, dto),
    ).resolves.toEqual(expected);
  });

  it('POST /fleet/incidents calls createIncident', async () => {
    const dto = {
      vehicleId: '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
      incidentType: FleetIncidentType.PANNE,
      severity: FleetIncidentSeverity.CRITIQUE,
      description: 'Panne moteur complete',
    };
    const expected = { id: 'inc-id', ...dto };
    fleetServiceMock.createIncident.mockResolvedValue(expected);

    await expect(controller.createIncident(dto)).resolves.toEqual(expected);
  });

  it('GET /fleet/incidents calls listIncidents', async () => {
    const expected = [{ id: 'inc-id' }];
    fleetServiceMock.listIncidents.mockResolvedValue(expected);

    await expect(controller.listIncidents()).resolves.toEqual(expected);
  });

  it('POST /fleet/schedule-slots calls createScheduleSlot', async () => {
    const dto = {
      vehicleId: '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
      startAt: new Date('2026-04-01T08:00:00Z'),
      endAt: new Date('2026-04-01T12:00:00Z'),
      slotType: 'MAINTENANCE',
    };
    const expected = { id: 'slot-id', ...dto };
    fleetServiceMock.createScheduleSlot.mockResolvedValue(expected);

    await expect(controller.createScheduleSlot(dto)).resolves.toEqual(expected);
  });
});
