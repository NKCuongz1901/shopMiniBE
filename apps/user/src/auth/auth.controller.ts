import { Body, Controller, Post, Request, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Response } from "express";
import { LocalAuthGuard } from "./local-auth.guard";

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@Request() req, @Res() res: Response) {
        const tokens = await this.authService.login(req.user);
        res.cookie('access_token', tokens.access_token, { httpOnly: true });
        res.cookie('refresh_token', tokens.refresh_token, { httpOnly: true });
        return res.json(tokens);
    }

    @Post('refresh')
    async refreshToken(@Body('refreshToken') refreshToken: string) {
        return this.authService.refreshToken(refreshToken);
    }
}