import { Test, TestingModule } from '@nestjs/testing';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

describe('VehiclesController', () => {
  let controller: VehiclesController;

  const vehiclesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    checkAvailability: jest.fn(),
    uploadImage: jest.fn(),
    removeImage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiclesController],
      providers: [
        {
          provide: VehiclesService,
          useValue: vehiclesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<VehiclesController>(VehiclesController);
  });

  it('POST /vehicles calls create', async () => {
    const dto = {
      name: 'Tesla Model X 2024',
      brand: 'Tesla',
      model: 'Model X',
      year: 2024,
      category: 'SUV',
      transmission: 'AUTOMATIQUE',
      energy: 'ELECTRIQUE',
      seats: 7,
      includedKmPerDay: 200,
      pricePerDay: 159.99,
      streetAddress: '12 Rue de Rivoli',
      city: 'Paris',
      latitude: 48.856614,
      longitude: 2.3522219,
    };
    const expected = { id: 'veh-id', ...dto };
    vehiclesServiceMock.create.mockResolvedValue(expected);

    await expect(controller.create(dto)).resolves.toEqual(expected);
    expect(vehiclesServiceMock.create).toHaveBeenCalledWith(dto);
  });

  it('GET /vehicles calls findAll', async () => {
    const expected = [{ id: 'veh-id' }];
    vehiclesServiceMock.findAll.mockResolvedValue(expected);

    await expect(controller.findAll()).resolves.toEqual(expected);
    expect(vehiclesServiceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('GET /vehicles/:id calls findOne', async () => {
    const expected = { id: 'veh-id' };
    vehiclesServiceMock.findOne.mockResolvedValue(expected);

    await expect(
      controller.findOne('8c2d4cb8-6220-4fb8-a391-7a2ba81c9688'),
    ).resolves.toEqual(expected);
  });

  it('GET /vehicles/:id/availability calls checkAvailability', async () => {
    const expected = { vehicleId: 'veh-id', available: true };
    vehiclesServiceMock.checkAvailability.mockResolvedValue(expected);

    await expect(
      controller.checkAvailability(
        '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
        '2026-04-01T08:00:00Z',
        '2026-04-01T12:00:00Z',
      ),
    ).resolves.toEqual(expected);
  });

  it('PATCH /vehicles/:id calls update', async () => {
    const dto = { city: 'Nanterre' };
    const expected = { id: 'veh-id', city: 'Nanterre' };
    vehiclesServiceMock.update.mockResolvedValue(expected);

    await expect(
      controller.update('8c2d4cb8-6220-4fb8-a391-7a2ba81c9688', dto),
    ).resolves.toEqual(expected);
    expect(vehiclesServiceMock.update).toHaveBeenCalledWith(
      '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
      dto,
    );
  });

  it('DELETE /vehicles/:id calls remove', async () => {
    const expected = { message: 'Vehicle deleted successfully' };
    vehiclesServiceMock.remove.mockResolvedValue(expected);

    await expect(
      controller.remove('8c2d4cb8-6220-4fb8-a391-7a2ba81c9688'),
    ).resolves.toEqual(expected);
  });

  it('POST /vehicles/:id/images/upload calls uploadImage', async () => {
    const file = {
      buffer: Buffer.from('fake-image-data'),
      mimetype: 'image/png',
      originalname: 'vehicle.png',
    } as Express.Multer.File;
    const expected = {
      id: 'img-id',
      url: 'https://res.cloudinary.com/demo/image/upload/test.jpg',
    };
    vehiclesServiceMock.uploadImage.mockResolvedValue(expected);

    await expect(
      controller.uploadImage('8c2d4cb8-6220-4fb8-a391-7a2ba81c9688', file, 1),
    ).resolves.toEqual(expected);

    expect(vehiclesServiceMock.uploadImage).toHaveBeenCalledWith(
      '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
      file,
      1,
    );
  });

  it('DELETE /vehicles/:id/images/:imageId calls removeImage', async () => {
    const expected = { message: 'Vehicle image deleted successfully' };
    vehiclesServiceMock.removeImage.mockResolvedValue(expected);

    await expect(
      controller.removeImage(
        '8c2d4cb8-6220-4fb8-a391-7a2ba81c9688',
        'de8a85cc-8b8b-41a8-9b57-8da4fc9a8049',
      ),
    ).resolves.toEqual(expected);
  });
});
