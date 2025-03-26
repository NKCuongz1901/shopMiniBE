import { NestFactory } from '@nestjs/core';
import { UploadServiceModule } from './upload-service.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(UploadServiceModule);
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  app.setGlobalPrefix('api/v1')
  await app.listen(port);


}
bootstrap();
