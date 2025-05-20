// payment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;
@Schema({ timestamps: true })
export class Payment  {
  @Prop({ required: true })
  orderId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  method: string; // e.g., 'VNPAY'

  @Prop({ required: true, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' })
  status: string;

  @Prop()
  transactionId?: string; // Mã GD từ VNPAY

  @Prop()
  responseCode?: string; // vnp_ResponseCode

  @Prop()
  paymentTime?: Date;

  @Prop()
  clientIp?: string;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
