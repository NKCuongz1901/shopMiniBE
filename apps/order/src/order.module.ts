import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schema/order.schema';
import { HttpModule } from '@nestjs/axios';
import { RabbitMQModule } from 'libs/rabbitmq/rabbitmq.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/order/.env'
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI')
      }),
      inject: [ConfigService]
    }),
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    HttpModule,
    RabbitMQModule
  ],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule { }
