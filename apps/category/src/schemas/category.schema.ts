import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ type: String, default: null })
  parentId: string;

  @Prop({ type: String, default: '' })
  description: string;

  @Prop({ type: Number, default: 0 })
  priority: number;

  @Prop({ type: String, default: 'electronics' })
  type: string;

}

export const CategorySchema = SchemaFactory.createForClass(Category);
