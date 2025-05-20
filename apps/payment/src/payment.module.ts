
import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/payment.schema';
import { GLOBAL_CONFIG, HASH_ALGORITHM } from './token';
import { LoggerService } from './logger.service';
import { GlobalConfig } from './types'; 
import { ProductCode, VnpCurrCode ,VnpLocale,HashAlgorithm} from './enums/index';
import { config } from 'process';
import { HttpModule } from '@nestjs/axios';
import { RabbitMQModule } from 'libs/rabbitmq/rabbitmq.module';

// const globalConfig: GlobalConfig = {
//   vnpayHost: 'https://sandbox.vnpayment.vn',
//   tmnCode: config.get<string>('TMN_CODE'),
//   secureSecret: 'YOUR_SECRET',
//   vnp_Version: '2.1.0',
//   vnp_CurrCode: VnpCurrCode.VND,
//   vnp_Locale: VnpLocale.VN,
//   vnp_Command: 'pay',
//   vnp_OrderType: ProductCode.Other,
//   paymentEndpoint: 'paymentv2/vpcpay.html',
//   endpoints: {}, // cấu hình endpoint nếu có
// };

@Module({
  imports: [
    ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: './apps/payment/.env'
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            uri: configService.get<string>('MONGODB_URI'),
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]), 
        HttpModule,
        RabbitMQModule
       
        
  ],
  controllers: [PaymentController],
  providers: [PaymentService, LoggerService ,{
      provide: GLOBAL_CONFIG,
     useFactory: (configService: ConfigService): GlobalConfig => ({
      vnpayHost: 'https://sandbox.vnpayment.vn',
      tmnCode: configService.get<string>('vnp_TmnCode', ''), // fallback ''
      secureSecret: configService.get<string>('vnp_HashSecret', ''),
      vnp_Version: '2.1.0',
      vnp_CurrCode: VnpCurrCode.VND,
      vnp_Locale: VnpLocale.VN,
      vnp_Command: 'pay',
      vnp_OrderType: ProductCode.Other,
      paymentEndpoint: 'paymentv2/vpcpay.html',
      endpoints: {}, // tùy chỉnh nếu có
    }),
    inject: [ConfigService],
    }, {
      provide: HASH_ALGORITHM,
      useValue: HashAlgorithm.SHA512,
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {}
