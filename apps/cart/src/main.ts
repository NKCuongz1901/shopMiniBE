import { NestFactory } from '@nestjs/core';
import { CartModule } from './cart.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(CartModule);
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  const urlMongo = configService.get('MONGODB_URI');
  app.setGlobalPrefix("api/v1");
  await app.listen(port);
  console.log(port)

}
bootstrap();
