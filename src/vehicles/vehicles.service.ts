import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  buildPaginatedResponse,
  resolvePagination,
  type PaginatedResponse,
} from '../shared/pagination/pagination.util';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle, VehicleOperationalStatus } from './entities/vehicle.entity';
import { VehicleImage } from './entities/vehicle-image.entity';
import { CloudinaryService } from '../shared/storage/cloudinary.service';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @InjectRepository(VehicleImage)
    private readonly imageRepository: Repository<VehicleImage>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehicleRepository.create({
      ...dto,
      pricePerDay: dto.pricePerDay.toFixed(2),
      rating: (dto.rating ?? 0).toFixed(2),
      availableCities: dto.availableCities ?? [],
      isActive: dto.isActive ?? true,
      reviewCount: dto.reviewCount ?? 0,
      latitude: dto.latitude.toString(),
      longitude: dto.longitude.toString(),
    });

    const savedVehicle = await this.vehicleRepository.save(vehicle);

    // Keep image ordering deterministic for frontend galleries.
    if (dto.images?.length) {
      const images = dto.images.map((image) =>
        this.imageRepository.create({
          vehicleId: savedVehicle.id,
          url: image.url,
          publicId: null,
          sortOrder: image.sortOrder ?? 0,
        }),
      );
      await this.imageRepository.save(images);
    }

    return this.findOne(savedVehicle.id);
  }

  async findAll(page = 1, limit = 20): Promise<PaginatedResponse<Vehicle>> {
    const pagination = resolvePagination(page, limit);
    const [items, totalItems] = await this.vehicleRepository.findAndCount({
      relations: { images: true },
      order: {
        createdAt: 'DESC',
        images: {
          sortOrder: 'ASC',
        },
      },
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

  async findOne(id: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id },
      relations: { images: true },
      order: {
        images: {
          sortOrder: 'ASC',
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto): Promise<Vehicle> {
    const vehicle = await this.findOne(id);

    Object.assign(vehicle, {
      ...dto,
      pricePerDay:
        dto.pricePerDay !== undefined
          ? dto.pricePerDay.toFixed(2)
          : vehicle.pricePerDay,
      rating: dto.rating !== undefined ? dto.rating.toFixed(2) : vehicle.rating,
      latitude:
        dto.latitude !== undefined ? dto.latitude.toString() : vehicle.latitude,
      longitude:
        dto.longitude !== undefined
          ? dto.longitude.toString()
          : vehicle.longitude,
      availableCities: dto.availableCities ?? vehicle.availableCities,
    });

    await this.vehicleRepository.save(vehicle);

    if (dto.images) {
      // Full replacement simplifies synchronization with frontend forms.
      const existingImages = await this.imageRepository.find({
        where: { vehicleId: id },
      });

      for (const image of existingImages) {
        if (image.publicId) {
          await this.cloudinaryService.deleteAsset(image.publicId);
        }
      }

      await this.imageRepository.delete({ vehicleId: id });
      if (dto.images.length) {
        const images = dto.images.map((image) =>
          this.imageRepository.create({
            vehicleId: id,
            url: image.url,
            publicId: null,
            sortOrder: image.sortOrder ?? 0,
          }),
        );
        await this.imageRepository.save(images);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<{ message: string }> {
    const vehicle = await this.vehicleRepository.findOne({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const images = await this.imageRepository.find({
      where: { vehicleId: id },
    });

    for (const image of images) {
      if (image.publicId) {
        await this.cloudinaryService.deleteAsset(image.publicId);
      }
    }

    await this.vehicleRepository.delete({ id });
    return { message: 'Vehicle deleted successfully' };
  }

  async uploadImage(
    vehicleId: string,
    file: Express.Multer.File,
    sortOrder = 0,
  ): Promise<VehicleImage> {
    await this.findOne(vehicleId);

    const upload = await this.cloudinaryService.uploadVehicleImage({
      vehicleId,
      fileBuffer: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });

    const image = this.imageRepository.create({
      vehicleId,
      url: upload.secureUrl,
      publicId: upload.publicId,
      sortOrder,
    });

    return this.imageRepository.save(image);
  }

  async removeImage(
    vehicleId: string,
    imageId: string,
  ): Promise<{ message: string }> {
    const image = await this.imageRepository.findOne({
      where: { id: imageId, vehicleId },
    });

    if (!image) {
      throw new NotFoundException('Vehicle image not found');
    }

    if (image.publicId) {
      await this.cloudinaryService.deleteAsset(image.publicId);
    }

    await this.imageRepository.delete({ id: imageId });
    return { message: 'Vehicle image deleted successfully' };
  }

  async checkAvailability(
    id: string,
    startAt?: string,
    endAt?: string,
  ): Promise<{ vehicleId: string; available: boolean }> {
    const vehicle = await this.findOne(id);

    if ((startAt && !endAt) || (!startAt && endAt)) {
      throw new BadRequestException('Both startAt and endAt must be provided');
    }

    // Phase 2 placeholder: scheduling constraints will be connected to reservations/fleet modules.
    const available =
      vehicle.isActive &&
      vehicle.operationalStatus === VehicleOperationalStatus.DISPONIBLE &&
      !!startAt === !!endAt;

    return {
      vehicleId: vehicle.id,
      available,
    };
  }
}
