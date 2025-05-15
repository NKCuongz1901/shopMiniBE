import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import amqp from "amqp-connection-manager";
import { RabbitMQService } from "./rabbitmq.service";

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: './libs/rabbitmq/.env.example'
        }),
    ],
    providers: [
        {
            provide: "RABBITMQ_CONNECTION",
            useFactory: async (configService: ConfigService) => {
                const rabbitMQUrl = configService.get<string>('RABBITMQ_URL');
                const connection = amqp.connect([rabbitMQUrl]);
                console.log("RabbitMQ URL:", rabbitMQUrl);
                connection.on('connect', () => console.log("✅onnect to rabbitMQ"));
                connection.on('disconnect', (err) => console.error(" ❌ Channeldisconnect from rabbitMQ", err));
                return connection;
            },
            inject: [ConfigService]
        },
        RabbitMQService
    ],
    exports: ['RABBITMQ_CONNECTION', RabbitMQService],
})

export class RabbitMQModule { }