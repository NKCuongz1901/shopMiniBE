import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Order extends Document {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop([
        {
            productId: { type: Types.ObjectId, ref: 'Product', required: true },
            name: String,
            image: String,
            quantity: Number,
            price: Number,
            total: Number,
        },
    ])
    items: {
        productId: Types.ObjectId;
        name: string;
        image: string;
        quantity: number;
        price: number;
        total: number;
    }[];

    @Prop({ required: true })
    totalPrice: number;

    @Prop({ required: true, enum: ['COD', 'BANK_TRANSFER'] })
    paymentMethod: string;

    @Prop({ required: true })
    shippingAddress: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ default: 'PENDING', enum: ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] })
    status: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
