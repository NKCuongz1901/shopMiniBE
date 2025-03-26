import { Controller, Get, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { UploadService } from './upload-service.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('upload')
export class UploadServiceController {
  constructor(private readonly uploadService: UploadService) { }

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const result = await this.uploadService.uploadImage(file);
    return {
      success: true,
      message: 'Upload image successful',
      data: {
        url: result.secure_url,
        public_id: result.public_id
      }
    }
  }
}
