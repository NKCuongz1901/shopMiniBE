import { BadRequestException, Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Request, Response } from 'express';
import { BuildPaymentUrlLogger, BuildPaymentUrlOptions } from './types';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create_payment_url')
  createPaymentUrl(@Body() dto: CreatePaymentDto, @Req() req: Request, @Res() res: Response) {
    try {
      // Chuẩn bị dữ liệu cho buildPaymentUrl
      const buildPaymentData = {
        vnp_Amount: dto.amount,
        vnp_TxnRef: dto.orderId || new Date().getTime().toString(), // Sử dụng orderId hoặc timestamp
        vnp_OrderInfo: dto.orderDescription || 'Thanh toan don hang',
        vnp_IpAddr: '127.0.0.1', // Lấy IP từ request
        vnp_ReturnUrl: 'http://localhost:5173/vnpay-return', // Cứng tạm thời, nên dùng config
        vnp_BankCode: 'NCB', // Mã ngân hàng tùy chọn
      };

      // Tạo options với logger hợp lệ
      const options: BuildPaymentUrlOptions<keyof BuildPaymentUrlLogger> = {
        withHash: true, // Bao gồm secure hash
        logger: {
          type: 'all', // Ghi log tất cả các trường
          loggerFn: (data: BuildPaymentUrlLogger) => {
            // Sử dụng console.log tạm thời
            console.log('Dữ liệu URL thanh toán:', data);
          },
        },
      };

      // Tạo URL thanh toán bằng buildPaymentUrl
      const paymentUrl = this.paymentService.buildPaymentUrl(buildPaymentData, options);
      console.log('buildPaymentData:', buildPaymentData);
      console.log('options:', options);
      console.log('paymentUrl:', paymentUrl);
      // res.redirect(paymentUrl); // Chuyển hướng đến URL thanh toán VNPay
      res.status(200).json({ paymentUrl }); // Trả về URL thanh toán
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  @Get('vnpay-return')
async handleVnpayReturn(@Query() query: any) {
  const verify = this.paymentService.verifyReturnUrl(query);
  console.log('verify:', verify);
  if (!verify.isVerified) {
    throw new BadRequestException('Chữ ký không hợp lệ');
  }

  // Bạn có thể dùng verify.isSuccess luôn
  const result = {
    orderId: verify.vnp_TxnRef,
    status: verify.isSuccess ? 'PAID' : 'FAILED',
    amount: verify.vnp_Amount,            // đã /100
  };

  // Gửi thông báo RabbitMQ nếu muốn
   await this.paymentService.notifyOrderStatusUpdate(result);

  return result;
}

}