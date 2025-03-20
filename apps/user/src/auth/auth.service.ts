import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { User } from "../schemas/user.schemas";
import { Model } from "mongoose";
import { comparePassword } from "../helpers/services";


@Injectable()
export class AuthService {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService,
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
        const payload = { email: user.email, userId: user._id, role: user.role };
        const access_token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('JWT_SECRET'),
            expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
        });
        const refresh_token = this.jwtService.sign(payload, {
            secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
            expiresIn: this.configService.get<string>('REFRESH_TOKEN_EXPIRATION'),
        });
        user.refresh_token = refresh_token;
        await user.save();
        return { access_token, refresh_token };
    }

    // RefreshToken function
    async refreshToken(refreshToken: string) {
        try {
            const payload = this.jwtService.verify(refreshToken, {
                secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
            });

            const user = await this.userModel.findById(payload.sub);
            if (!user || user.refreshToken !== refreshToken) {
                throw new UnauthorizedException('Refresh Token không hợp lệ');
            }

            return this.login(user);
        } catch (error) {
            throw new UnauthorizedException('Refresh Token hết hạn hoặc không hợp lệ');
        }
    }
}