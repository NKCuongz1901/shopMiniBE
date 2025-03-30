import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  app.setGlobalPrefix("api/v1");
  await app.listen(port);
  console.log("Order service is running on port: ", port);
}
bootstrap();
