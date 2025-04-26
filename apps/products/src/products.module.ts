import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';
import { RabbitMQModule } from 'libs/rabbitmq/rabbitmq.module';
import { InternalApiMiddleware } from './internal-api.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/products/.env'
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (ConfigService: ConfigService) => ({
        uri: ConfigService.get<string>('MONGODB_URI')
      }),
      inject: [ConfigService]
    }),
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    RabbitMQModule

  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService]

})
export class ProductsModule { 
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(InternalApiMiddleware)
      .forRoutes('*'); // Áp dụng cho tất cả route
  }
}
