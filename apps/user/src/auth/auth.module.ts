import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { LocalAuthGuard } from "./local-auth.guard";
import { LocalStrategy } from "./local.strategy";
import { UserModule } from "../user.module";
import { AuthService } from "./auth.service";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "../schemas/user.schemas";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { AuthController } from "./auth.controller";
@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                global: true,
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRED'),

                },
            }),
            inject: [ConfigService],


        }),
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                transport: {
                    host: 'smtp.gmail.com',
                    port: 465,
                    ignoreTLS: true,
                    secure: true,
                    auth: {
                        user: configService.get<string>('MAIL_USER'),
                        pass: configService.get<string>('MAIL_PASSWORD'),
                    },
                },
                defaults: {
                    from: '"ShopMini" <noreply@shopmini.com>',
                },
                template: {
                    dir: process.cwd() + '/apps/user/src/mail/template/',
                    adapter: new HandlebarsAdapter(), // or new PugAdapter() or new EjsAdapter()
                    options: {
                        strict: true,
                    },
                },
            }),
            inject: [ConfigService],
        })

    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, LocalAuthGuard, LocalStrategy],
    exports: [JwtModule, PassportModule, AuthService],
})
export class AuthModule { }