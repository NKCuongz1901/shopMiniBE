import { IsEmail, IsNotEmpty } from "class-validator";

export class VerityAuthDto {
    @IsEmail({}, { message: 'Email invalid' })
    @IsNotEmpty({ message: 'Email is empty' })
    email: string;

    @IsNotEmpty({ message: 'Code is empty' })
    code: string;
}