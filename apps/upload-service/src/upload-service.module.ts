import { Module } from '@nestjs/common';
import { UploadServiceController } from './upload-service.controller';
import { UploadService } from './upload-service.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/upload-service/.env'
    })
  ],
  controllers: [UploadServiceController],
  providers: [UploadService],
  exports: [UploadService]
})
export class UploadServiceModule { }
