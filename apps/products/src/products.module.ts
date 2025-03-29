import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Product, ProductSchema } from './schemas/product.schema';

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
  ],
  controllers: [ProductsController],
  providers: [ProductsService],


})
export class ProductsModule { }
