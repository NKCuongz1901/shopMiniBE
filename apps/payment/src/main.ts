import { NestFactory } from '@nestjs/core';
import { PaymentModule } from './payment.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);
    const configService = app.get(ConfigService);
    const port = configService.get('PORT');
    app.setGlobalPrefix('api/v1')
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.listen(port);
    console.log("payment service is running on port: ", port);
}
bootstrap();
