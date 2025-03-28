import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose from "mongoose";

@Schema({ timestamps: true })
export class Product {
    @Prop()
    productName: string;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "Category" })
    category: mongoose.Types.ObjectId;

    @Prop()
    slug: string;

    @Prop()
    quantity: number;

    @Prop()
    image: string;

    @Prop()
    price: number;

    @Prop()
    description: string;


    createdAt: Date;
    updateAt: Date;


}

export const ProductSchema = SchemaFactory.createForClass(Product);