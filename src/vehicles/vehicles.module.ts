import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsGuard } from '../iam/guards/permissions.guard';
import { StorageModule } from '../shared/storage/storage.module';
import { VehicleImage } from './entities/vehicle-image.entity';
import { Vehicle } from './entities/vehicle.entity';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';

@Module({
  imports: [TypeOrmModule.forFeature([Vehicle, VehicleImage]), StorageModule],
  controllers: [VehiclesController],
  providers: [VehiclesService, PermissionsGuard],
  exports: [VehiclesService],
})
export class VehiclesModule {}
