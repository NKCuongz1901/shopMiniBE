import { Inject, Injectable } from "@nestjs/common";
import { AmqpConnectionManager, ChannelWrapper } from "amqp-connection-manager";
import { RabbitMQMessage } from "./rabbitmq.interface";


@Injectable()
export class RabbitMQService {
    private channel: ChannelWrapper
    
    constructor(@Inject("RABBITMQ_CONNECTION") private connection: AmqpConnectionManager) {
        this.channel = this.connection.createChannel({
            json: true,
            setup: async (channel) => {
                console.log(' RabbitMQ channel setup');
            },
        });
    }


    // Send message to service
    async sendMessage(queue: string, message: RabbitMQMessage) {
        console.log("Sending helllooo queue111:", queue);
        await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
        console.log(`📩 Sent message to ${queue}`, message);
        
    }



    // Receive message
    // async consumeMessage(queue: string, callback: (data: any) => void) {
    //     await this.channel.addSetup(async (channel) => {
    //         await channel.assertQueue(queue, { durable: true });
    //         await channel.consume(queue, (msg) => {
    //             if (msg) {
    //                 const data = JSON.parse(msg.content.toString());
    //                 console.log(`📥 Received message from ${queue}`, data);
    //                 callback(data);
    //                 channel.ack(msg);
    //             }
    //         });
    //     });
    // }
    async consumeMessage(queue: string, callback: (data: any) => void) {
        await this.channel.addSetup(async (channel) => {
            await channel.assertQueue(queue, { durable: true });
            await channel.consume(queue, (msg) => {
                if (msg && msg.content) {
                    try {
                        // Kiểm tra nếu msg.content là một Buffer
                        const rawBuffer = msg.content;

                        // Chuyển đổi Buffer thành chuỗi JSON
                        const rawMessage = Buffer.from(rawBuffer).toString("utf-8");

                        console.log(`📥 Received raw message from ${queue}:`, rawMessage);

                        // Parse JSON từ chuỗi đã chuyển đổi
                        const parsedMessage = JSON.parse(rawMessage);

                        // Nếu message chứa 'data', lấy ra dữ liệu chính
                        const data = parsedMessage.data ? parsedMessage.data : parsedMessage;

                        console.log("✅ Parsed message:", data);

                        // Gọi callback với dữ liệu thực sự
                        callback(data);

                        // Xác nhận đã xử lý message
                        channel.ack(msg);
                    } catch (error) {
                        console.error("❌ Error parsing message:", error);
                    }
                } else {
                    console.error("❌ Received empty or undefined message");
                }
            });
        });
    }


}