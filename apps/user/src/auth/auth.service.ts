import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "../schemas/user.schemas";
import { Model } from "mongoose";
import { comparePassword, hashPasswordHelper } from "../helpers/services";
import { MailerService } from "@nestjs-modules/mailer";
import { RegisterAuthDto } from "./dto/register-auth.dto";


@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
        private mailerService: MailerService,
        @InjectModel(User.name) private userModel: Model<User>,
    ) { }

    // Check validate user
    async validateUser(email: string, password: string) {
        const user = await this.userModel.findOne({ email });
        const isValidPassword = await comparePassword(password, user?.password);
        if (!user || !isValidPassword) {
            throw new UnauthorizedException('Email or password is incorrect');
        }
        return user;
    }

    // Login function
    async login(user: any) {
        const payload = { email: user.email, userId: user._id, role: user.role, name: user.name };
        const access_token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>('JWT_EXPIRED'),
        });
        const refresh_token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
            expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRATION'),
        });
        user.refresh_token = refresh_token;
        await user.save();
        return {
            success: true,
            message: 'Login Success',
            data: {
                user: {
                    id: user._id,
                    name: user.name, // Đảm bảo user có field fullName
                    email: user.email,
                    role: user.role,

                },
                tokens: {
                    access_token,
                    refresh_token,
                },
            },
        };
    }

    // RefreshToken function
    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
            });

            const user = await this.userModel.findById(payload.sub);
            if (!user || user.refreshToken !== refreshToken) {
                throw new UnauthorizedException('Refresh Token invalid');
            }

            return this.login(user);
        } catch (error) {
            throw new UnauthorizedException('Refresh Token is expired or invalid');
        }
    }

    //Handle register
    async register(registerAuthDto: RegisterAuthDto) {
        const { email, name, password } = registerAuthDto;
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new ConflictException('Email is already existing');
        }
        const hashPassword = await hashPasswordHelper(password);
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const user = await this.userModel.create({
            email,
            name,
            password: hashPassword,
            codeId: verificationCode,
            codeExpired: new Date(Date.now() + 10 * 60 * 1000),
            isActive: false
        });
        await this.sendVerifyMail(user.email, verificationCode);
        return { message: "Please check your email to verify your account" };
    }

    // Sendmail
    async sendVerifyMail(email: string, code: string) {
        await this.mailerService.sendMail({
            to: email,
            subject: "Verify Your Account",
            template: "register", // Cần tạo template verify-email.hbs
            context: { code, email },
        });
    }

    // verity account
    async verityAccount(email: string, code: string) {
        const user = await this.userModel.findOne({ email });
        if (user?.codeId !== code) {
            throw new BadRequestException('Invalid code');
        }
        if (user.codeExpired < new Date()) {
            throw new BadRequestException('Code is expired');
        }
        user.isActive = true;
        await user.save()
        return { message: 'Your account has been verified' };
    }

    // Fetch user
    async getMe(user: any) {
        return {
            success: true,
            message: 'Fetch user success',
            data: {
                user: {
                    id: user.userId,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                },
            }
        }
    }
}