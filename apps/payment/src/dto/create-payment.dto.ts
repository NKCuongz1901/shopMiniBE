import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderId: string;
  @IsNumber()
  @IsNotEmpty()
  amount: number;
  @IsString()
  @IsNotEmpty()
  orderDescription: string;

  // @IsString()
  // @IsNotEmpty()
  // bankCode: string;
  
 
 
}
