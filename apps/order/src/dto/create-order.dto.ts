import { IsNotEmpty, IsString } from "class-validator";

export class CreateOrderDto {
    @IsNotEmpty({ message: "Address should not empty" })
    @IsString()
    shippingAddress: string;

    @IsNotEmpty({ message: "Phone number should not empty" })
    @IsString()
    phone: string;


    @IsNotEmpty({ message: "Payment method should not empty" })
    @IsString()
    paymentMethod: string;

    @IsNotEmpty({ message: "Product ids should not empty" })
    @IsString({ each: true })
    productIds: string[];
}