import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';

@Schema({ timestamps: true })
export class Cart extends Document {
    @Prop({ type: Types.ObjectId, required: true })
    userId: Types.ObjectId;

    @Prop({
        type: [
            {
                productId: { type: Types.ObjectId, required: true },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
                total: { type: Number, required: true },
            },
        ],
        default: [],
    })
    items: {
        productId: Types.ObjectId;
        quantity: number;
        price: number;
        total: number;
    }[];

    @Prop({ default: 0 })
    totalPrice: number;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
