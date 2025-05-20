import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Payment } from './schemas/payment.schema';
import { Model } from 'mongoose';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';
import * as qs from 'qs';
import * as crypto from 'crypto';
import * as moment from 'moment';

import { HashAlgorithm } from './enums';
import { BuildPaymentUrl, BuildPaymentUrlLogger, BuildPaymentUrlOptions, DefaultConfig,GlobalConfig, ReturnQueryFromVNPay, VerifyReturnUrl, VerifyReturnUrlLogger, VerifyReturnUrlOptions } from './types';
import { buildPaymentUrlSearchParams, calculateSecureHash, createPaymentUrl, dateFormat, getDateInGMT7, getResponseByStatusCode, isValidVnpayDateFormat, verifySecureHash } from './utils';
import { LoggerService } from './logger.service';
import { GLOBAL_CONFIG, HASH_ALGORITHM } from './token';
import { numberRegex } from './constants';
import { RabbitMQService } from 'libs/rabbitmq/rabbitmq.service';
import { RabbitMQMessage } from 'libs/rabbitmq/rabbitmq.interface';
import { QUEUE_ORDER_TO_PAYMENT } from 'libs/rabbitmq/rabbitmq.constants';


@Injectable()
export class PaymentService {
   private readonly config: GlobalConfig;
    private readonly defaultConfig: DefaultConfig;
    private readonly logger: LoggerService;
    private readonly hashAlgorithm: HashAlgorithm;
    private readonly bufferEncode: BufferEncoding = 'utf-8';
   
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    @Inject(GLOBAL_CONFIG) config: GlobalConfig, 
    logger: LoggerService,
    @Inject(HASH_ALGORITHM) hashAlgorithm: HashAlgorithm
    , private readonly configService: ConfigService,
    private readonly rabbitMQService: RabbitMQService,
  ) {
    this.config = config;
        this.hashAlgorithm = hashAlgorithm;
        this.logger = logger;

        this.defaultConfig = {
            vnp_TmnCode: config.tmnCode,
            vnp_Version: config.vnp_Version,
            vnp_CurrCode: config.vnp_CurrCode,
            vnp_Locale: config.vnp_Locale,
            vnp_Command: config.vnp_Command,
            vnp_OrderType: config.vnp_OrderType,
        };
  }

   public buildPaymentUrl<LoggerFields extends keyof BuildPaymentUrlLogger>(
        data: BuildPaymentUrl,
        options?: BuildPaymentUrlOptions<LoggerFields>,
    ): string {
        const dataToBuild = {
            ...this.defaultConfig,
            ...data,

            // Multiply by 100 to follow VNPay standard
            vnp_Amount: data.vnp_Amount * 100,
        };

        if (dataToBuild?.vnp_ExpireDate && !isValidVnpayDateFormat(dataToBuild.vnp_ExpireDate)) {
            throw new Error(
                'Invalid vnp_ExpireDate format. Use `dateFormat` utility function to format it',
            );
        }

        if (!isValidVnpayDateFormat(dataToBuild?.vnp_CreateDate ?? 0)) {
            const timeGMT7 = getDateInGMT7();
            dataToBuild.vnp_CreateDate = dateFormat(timeGMT7, 'yyyyMMddHHmmss');
        }

        const redirectUrl = createPaymentUrl({
            config: this.config,
            data: dataToBuild,
        });

        console.log('redirectUrl:', redirectUrl);

        const signed = calculateSecureHash({
            secureSecret: this.config.secureSecret,
            data: redirectUrl.search.slice(1).toString(),
            hashAlgorithm: this.hashAlgorithm,
            bufferEncode: this.bufferEncode,
        });
        console.log('signed:', signed);
        redirectUrl.searchParams.append('vnp_SecureHash', signed);

        console.log('redirectUrl with hash:', redirectUrl);
        // Log if enabled
        const data2Log: BuildPaymentUrlLogger = {
            createdAt: new Date(),
            method: 'buildPaymentUrl',
            paymentUrl: options?.withHash
                ? redirectUrl.toString()
                : (() => {
                      const cloneUrl = new URL(redirectUrl.toString());
                      cloneUrl.searchParams.delete('vnp_SecureHash');
                      return cloneUrl.toString();
                  })(),
            ...dataToBuild,
        };

        console.log('data2Log:', data2Log);

        this.logger.log(data2Log, options, 'buildPaymentUrl');

        return redirectUrl.toString();
    }


     public verifyReturnUrl<LoggerFields extends keyof VerifyReturnUrlLogger>(
        query: ReturnQueryFromVNPay,
        options?: VerifyReturnUrlOptions<LoggerFields>,
    ): VerifyReturnUrl {
        const { vnp_SecureHash = '', vnp_SecureHashType, ...cloneQuery } = query;

        if (typeof cloneQuery?.vnp_Amount !== 'number') {
            const isValidAmount = numberRegex.test(cloneQuery?.vnp_Amount ?? '');
            if (!isValidAmount) {
                throw new Error('Invalid amount');
            }
            cloneQuery.vnp_Amount = Number(cloneQuery.vnp_Amount);
        }

        const searchParams = buildPaymentUrlSearchParams(cloneQuery);
        const isVerified = verifySecureHash({
            secureSecret: this.config.secureSecret,
            data: searchParams.toString(),
            hashAlgorithm: this.hashAlgorithm,
            receivedHash: vnp_SecureHash,
        });

        let outputResults = {
            isVerified,
            isSuccess: cloneQuery.vnp_ResponseCode === '00',
            message: getResponseByStatusCode(
                cloneQuery.vnp_ResponseCode?.toString() ?? '',
                this.config.vnp_Locale,
            ),
        };

        if (!isVerified) {
            outputResults = {
                ...outputResults,
                message: 'Wrong checksum',
            };
        }

        const result = {
            ...cloneQuery,
            ...outputResults,
            vnp_Amount: cloneQuery.vnp_Amount / 100,
        };

        const data2Log: VerifyReturnUrlLogger = {
            createdAt: new Date(),
            method: 'verifyReturnUrl',
            ...result,
            vnp_SecureHash: options?.withHash ? vnp_SecureHash : undefined,
        };

        this.logger.log(data2Log, options, 'verifyReturnUrl');

        return result;
    }

    async notifyOrderStatusUpdate(result: any) {
        // Gửi tin nhắn để clear item đã đặt trong giỏ hàng
          const messageToOder: RabbitMQMessage = {
            pattern: "update-order-status",
            data: {
                orderId: result.orderId,
                status: result.status,
                amount: result.amount, // đã /100
            },
          };
          await this.rabbitMQService.sendMessage(QUEUE_ORDER_TO_PAYMENT, messageToOder);
  }
}
