import { Inject, Injectable } from "@nestjs/common";
import { AmqpConnectionManager, ChannelWrapper } from "amqp-connection-manager";
import { RabbitMQMessage } from "./rabbitmq.interface";

@Injectable()
export class RabbitMQService {
    private channel: ChannelWrapper
    constructor(@Inject("RABBITMQ_CONNECTION") private connection: AmqpConnectionManager) {
        this.channel = this.connection.createChannel({
            json: true,
            setup: (channel) => {
                console.log(' RabbitMQ channel setup');
            },
        });
    }


    // Send message to service
    async sendMessage(queue: string, message: RabbitMQMessage) {
        await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
        console.log(`Send message to ${queue}`, message);
    }


    // Receive message
    async consumeMessage(queue: string, callback: (data: any) => void) {
        await this.channel.addSetup(async (channel) => {
            await channel.assertQueue(queue, { durable: true });
            await channel.consume(queue, (msg) => {
                if (msg) {
                    const data = JSON.parse(msg.content.toString());
                    console.log(`📥 Received message from ${queue}`, data);
                    callback(data);
                    channel.ack(msg);
                }
            });
        });
    }

}