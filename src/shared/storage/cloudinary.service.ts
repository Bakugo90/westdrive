import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

type UploadedAsset = {
  secureUrl: string;
  publicId: string;
};

@Injectable()
export class CloudinaryService {
  private readonly enabled: boolean;
  private readonly folder: string;
  private readonly nodeEnv: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('CLOUDINARY_ENABLED', 'false') === 'true';
    this.folder = this.configService.get<string>(
      'CLOUDINARY_FOLDER',
      'westdrive',
    );
    this.nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    if (this.enabled) {
      cloudinary.config({
        cloud_name: this.configService.getOrThrow<string>(
          'CLOUDINARY_CLOUD_NAME',
        ),
        api_key: this.configService.getOrThrow<string>('CLOUDINARY_API_KEY'),
        api_secret: this.configService.getOrThrow<string>(
          'CLOUDINARY_API_SECRET',
        ),
      });
    }
  }

  async uploadVehicleImage(options: {
    vehicleId: string;
    fileBuffer: Buffer;
    mimeType: string;
    originalName: string;
  }): Promise<UploadedAsset> {
    if (!this.enabled) {
      if (this.nodeEnv === 'production') {
        throw new ServiceUnavailableException(
          'Cloudinary upload is disabled in production',
        );
      }

      const fakePublicId = `mock/${options.vehicleId}/${Date.now()}`;
      return {
        secureUrl: `https://res.cloudinary.com/demo/image/upload/${fakePublicId}.jpg`,
        publicId: fakePublicId,
      };
    }

    const dataUri = `data:${options.mimeType};base64,${options.fileBuffer.toString('base64')}`;

    try {
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: `${this.folder}/vehicles/${options.vehicleId}`,
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        filename_override: options.originalName,
      });

      return {
        secureUrl: result.secure_url,
        publicId: result.public_id,
      };
    } catch {
      throw new InternalServerErrorException('Cloudinary upload failed');
    }
  }

  async deleteAsset(publicId: string): Promise<void> {
    if (!this.enabled) {
      return;
    }

    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
      });
    } catch {
      throw new InternalServerErrorException('Cloudinary delete failed');
    }
  }
}
