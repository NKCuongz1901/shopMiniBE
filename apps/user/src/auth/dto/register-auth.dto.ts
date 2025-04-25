import { IsEmail, IsMongoId, IsNotEmpty, IsString, MinLength } from "class-validator";

export class RegisterAuthDto {
    @IsEmail({}, { message: 'Email invalid' })
    @IsNotEmpty({ message: 'Email is empty' })
    email: string;

    @IsNotEmpty({ message: 'Name is empty' })
    @IsString({ message: 'Invalid name' })
    name: string;

    @IsNotEmpty({ message: 'Password is empty' })
    @MinLength(6, { message: 'Password must have more than 6 character' })
    password: string;
}

