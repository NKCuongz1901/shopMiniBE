import { IsMongoId, IsNotEmpty, IsNumber, IsString, IsUrl, Min } from "class-validator";

export class CreateProductDto {
    @IsNotEmpty()
    @IsString()
    productName: string;

    @IsMongoId()
    @IsNotEmpty()
    category: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    quantity: number;

    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    price: number;

    @IsNotEmpty()
    @IsUrl()
    image: string;

    @IsNotEmpty()
    @IsString()
    description: string
}