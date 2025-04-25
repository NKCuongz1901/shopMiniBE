import { Body, Controller, Get, Post, Req, Request, Res, UseGuards } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Response } from "express";
import { LocalAuthGuard } from "./local-auth.guard";
import {  RegisterAuthDto } from "./dto/register-auth.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { RequestWithUser } from "./dto/request-user";
import { CreateUserDto } from "../dto/create-user.dto";


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

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMe(@Req() req: RequestWithUser) {
        const user = req.user;
        return this.authService.getMe(user);

    }

    @Post("user")
    async createUser(@Body() createUserDto: CreateUserDto) {   
    return this.authService.createUser(createUserDto); // truyền createUserDto vào hàm service
}
}