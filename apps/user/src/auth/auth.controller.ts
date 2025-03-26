import { Body, Controller, Post, Request, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Response } from "express";
import { LocalAuthGuard } from "./local-auth.guard";
import { RegisterAuthDto } from "./dto/register-auth.dto";

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req, @Res() res: Response) {
        const result = await this.authService.login(req.user);
        const { access_token, refresh_token } = result.data.tokens;
        res.cookie('access_token', access_token, { httpOnly: true });
        res.cookie('refresh_token', refresh_token, { httpOnly: true });
        return res.json(result);
    }

    @Post('refresh')
    async refreshToken(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
    }

    @Post('register')
    async register(@Body() registerAuthDto: RegisterAuthDto) {
        return this.authService.register(registerAuthDto);
    }

    @Post('verify')
    async verifyAccount(@Body() body: { email: string, code: string }) {
        return this.authService.verityAccount(body.email, body.code);
    }
}