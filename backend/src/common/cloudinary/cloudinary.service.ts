import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

export type UploadFolder = 'avatars' | 'cni' | 'parcels' | 'disputes';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder,
    publicId?: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const baseFolder = this.configService.get<string>('CLOUDINARY_FOLDER', 'colisn');
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${baseFolder}/${folder}`,
          public_id: publicId,
          resource_type: 'image',
          transformation: [
            { quality: 'auto', fetch_format: 'auto' },
            { width: 1200, crop: 'limit' }, // Limiter la résolution
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Erreur upload Cloudinary: ${error.message}`);
            reject(new BadRequestException(`Erreur lors de l'upload: ${error.message}`));
          } else {
            resolve(result!);
          }
        },
      );
      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      this.logger.warn(`Impossible de supprimer l'image Cloudinary: ${publicId}`);
    }
  }

  /**
   * Upload multiple images
   */
  async uploadImages(
    files: Express.Multer.File[],
    folder: UploadFolder,
  ): Promise<string[]> {
    const uploads = await Promise.all(
      files.map((file) => this.uploadImage(file, folder)),
    );
    return uploads.map((result) => result.secure_url);
  }
}
