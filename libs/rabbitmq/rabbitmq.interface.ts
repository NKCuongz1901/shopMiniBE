export interface RabbitMQMessage {
    pattern: string; // Kiểu message
    data: any;       // Dữ liệu gửi đi
}