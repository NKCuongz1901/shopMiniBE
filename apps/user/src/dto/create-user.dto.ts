import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateUserDto {
    //pipe validation
    @IsNotEmpty({message: 'name không được để trống', })
    name: string;

    @IsEmail({}, {message: 'Không phải Email'})
    @IsNotEmpty({message: 'Email không được để trống', })
    email: string;

    @IsNotEmpty({message: 'password không được để trống', })
    password: string;

    @IsNotEmpty({message: 'address không được để trống', })
    address: string;

    @IsNotEmpty({message: 'role không được để trống', })
    role: string;
 
}