
import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from './schema/order.schema';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';
import { RabbitMQService } from 'libs/rabbitmq/rabbitmq.service';
import { QUEUE_ORDER_TO_CART, QUEUE_ORDER_TO_PAYMENT, QUEUE_ORDER_TO_PRODUCT } from 'libs/rabbitmq/rabbitmq.constants';
import { RabbitMQMessage } from 'libs/rabbitmq/rabbitmq.interface';


@Injectable()
export class OrderService implements OnModuleInit {
  private productServiceUrl?: string;
  private cartServiceUrl?: string;
  private paymentServiceUrl?: string;
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private configService: ConfigService,
    private httpService: HttpService,
    private rabbitMQService: RabbitMQService,
  ) {
    this.productServiceUrl = this.configService.get('PRODUCT_SERVICE_URL');
    this.cartServiceUrl = this.configService.get('CART_SERVICE_URL');
    this.paymentServiceUrl = this.configService.get('PAYMENT_SERVICE_URL');
  }

  async onModuleInit() {
    await this.rabbitMQService.consumeMessage(QUEUE_ORDER_TO_PAYMENT, this.handleOrderMessage.bind(this));
  }

  async handleOrderMessage(msg: any) {
  console.log("Receive message from order: ", msg);
  if (!msg) {
    throw new BadRequestException("Msg may be undefined");
  }

  try {
    const rawMessage = Buffer.from(msg).toString("utf-8");
    console.log("✅ Dữ liệu đã chuyển thành chuỗi:", rawMessage);

    const parsedMessage = JSON.parse(rawMessage);
    console.log("✅ Parsed message:", parsedMessage);

    // Lấy dữ liệu bên trong 'data'
    const { data } = parsedMessage;
    if (!data) {
      throw new BadRequestException("Missing data field");
    }

    const { orderId, status, amount } = data;

    if (!orderId) {
      throw new BadRequestException("Missing orderId");
    }
    if (!status) {
      throw new BadRequestException("Missing status");
    }

    let newStatus = status;
    if (status === "PAID") {
      newStatus = "DELIVERED";
    } else if (status === "FAILED") {
      newStatus = "CANCELLED";
    }

    const updateResult = await this.orderModel.updateOne(
      { _id: new Types.ObjectId(orderId) },
      {
        $set: {
          status: newStatus,
          amount,
          updatedAt: new Date(),
        },
      }
    );

    console.log("Order status updated result:", updateResult);
  } catch (error) {
    console.error("Error processing message:", error);
  }
}



  // fetch product data
  private async fetchProductData(productId: string) {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.productServiceUrl}/${productId}`, {
          headers: {
            'x-internal-api-key': process.env.INTERNAL_API_KEY || 'my-secret-key',
          },
        })
      );
      return response.data;
    } catch (error) {
      throw new NotFoundException("cant find this product");
    }
  }

  // Fetch cart data
  private async fetchCartData(userId) {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.cartServiceUrl}/${userId}`, {
          headers: {
            'x-internal-api-key': process.env.INTERNAL_API_KEY || 'my-secret-key',
          },
        })
      );
      return response.data;
    } catch (error) {
      throw new NotFoundException("Cart not is empty");
    }
  }

 
async placeOrder(userId: string, createOrderDto: CreateOrderDto) {
  const { shippingAddress, phone, paymentMethod, productIds } = createOrderDto;

  const cart = await this.fetchCartData(userId);
  if (!cart || cart.items.length === 0) {
    throw new BadRequestException("Your cart is empty");
  }

  const selectedCartItems = cart.items.filter(item =>
    productIds.includes(item.productId)
  );

  if (selectedCartItems.length === 0) {
    throw new BadRequestException("No valid items selected for checkout");
  }

  let totalPrice = 0;
  const orderItems: {
    productId: string;
    name: string;
    image: string;
    quantity: number;
    price: number;
    total: number;
  }[] = [];

  for (const item of selectedCartItems) {
    const product = await this.fetchProductData(item.productId);
    if (!product) {
      throw new NotFoundException("Can't find this product");
    }
    if (product.quantity < item.quantity) {
      throw new BadRequestException("Not enough stock for this product");
    }

    const total = item.quantity * product.price;
    orderItems.push({
      productId: product._id,
      name: product.productName,
      image: product.image,
      quantity: item.quantity,
      price: product.price,
      total,
    });

    totalPrice += total;
  }

  const newOrder = new this.orderModel({
    userId: new Types.ObjectId(userId),
    items: orderItems,
    totalPrice,
    paymentMethod,
    shippingAddress,
    phone,
    status: "PENDING",
  });

  await newOrder.save();

  // Gửi tin nhắn cập nhật tồn kho
  for (const item of orderItems) {
    const message: RabbitMQMessage = {
      pattern: "update-product-stock",
      data: {
        productId: item.productId,
        quantity: item.quantity,
      },
    };
    await this.rabbitMQService.sendMessage(QUEUE_ORDER_TO_PRODUCT, message);
  }

  // Gửi tin nhắn để clear item đã đặt trong giỏ hàng
  const messageToCart: RabbitMQMessage = {
    pattern: "clear-cart-items",
    data: {
      userId: newOrder.userId,
      productIds,
    },
  };
  await this.rabbitMQService.sendMessage(QUEUE_ORDER_TO_CART, messageToCart);
 //totalPrice = totalPrice  100; // VNPay yêu cầu nhân 100
  // Nếu phương thức thanh toán là VNPay, tạo URL thanh toán và trả về cùng order
  const orderId = (newOrder._id as Types.ObjectId).toString();
  if (paymentMethod === 'BANK_TRANSFER') {
    const body = {
  amount: totalPrice/100 * 100,          // VNPay yêu cầu nhân 100
  orderId,
  orderDescription: `Thanh toán đơn hàng #${orderId}`,
};

    // Tạo URL thanh toán VNPay
    const paymentUrl = await lastValueFrom(
      this.httpService.post(`${this.paymentServiceUrl}/create_payment_url`,body,  {
        headers: {
          'x-internal-api-key': process.env.INTERNAL_API_KEY || 'my-secret-key',
        },
      })
    ).then(response => response.data.paymentUrl)
      .catch(error => {
        throw new BadRequestException("Error creating payment URL");
      });

    return { order: newOrder, paymentUrl };
  }

  // Nếu không phải VNPay thì trả về đơn hàng thôi
  return { order: newOrder };
}


//   async placeOrder(userId: string, createOrderDto: CreateOrderDto) {
//   const { shippingAddress, phone, paymentMethod, productIds } = createOrderDto;

//   const cart = await this.fetchCartData(userId);
//   if (!cart || cart.items.length === 0) {
//     throw new BadRequestException("Your cart is empty");
//   }

//   // Lọc những item trong giỏ hàng mà nằm trong productIds
//   const selectedCartItems = cart.items.filter(item =>
//     productIds.includes(item.productId)
//   );

//   if (selectedCartItems.length === 0) {
//     throw new BadRequestException("No valid items selected for checkout");
//   }

//   let totalPrice = 0;
//   const orderItems: {
//   productId: string;
//   name: string;
//   image: string;
//   quantity: number;
//   price: number;
//   total: number;
// }[] = [];


//   for (const item of selectedCartItems) {
//     const product = await this.fetchProductData(item.productId);
//     if (!product) {
//       throw new NotFoundException("Can't find this product");
//     }
//     if (product.quantity < item.quantity) {
//       throw new BadRequestException("Not enough stock for this product");
//     }

//     const total = item.quantity * product.price;
//     orderItems.push({
//       productId: product._id,
//       name: product.productName,
//       image: product.image,
//       quantity: item.quantity,
//       price: product.price,
//       total,
//     });

//     totalPrice += total;
//   }

//   const newOrder = new this.orderModel({
//     userId: new Types.ObjectId(userId),
//     items: orderItems,
//     totalPrice,
//     paymentMethod,
//     shippingAddress,
//     phone,
//     status: "PENDING",
//   });

//   await newOrder.save();

//   // Gửi tin nhắn cập nhật tồn kho
//   for (const item of orderItems) {
//     const message: RabbitMQMessage = {
//       pattern: "update-product-stock",
//       data: {
//         productId: item.productId,
//         quantity: item.quantity,
//       },
//     };
//     await this.rabbitMQService.sendMessage(QUEUE_ORDER_TO_PRODUCT, message);
//   }

//   // Gửi tin nhắn để clear item đã đặt trong giỏ hàng
//   const messageToCart: RabbitMQMessage = {
//     pattern: "clear-cart-items",
//     data: {
//       userId: newOrder.userId,
//       productIds, // chỉ xóa những sản phẩm đã thanh toán
//     },
//   };
//   await this.rabbitMQService.sendMessage(QUEUE_ORDER_TO_CART, messageToCart);

//   return newOrder;
// }


  // Get order by userID
  async getUserById(userId: string) {
    return this.orderModel.find({ userId: new Types.ObjectId(userId) }).sort({ createdAt: -1 }); // -1: mới nhất trước;
  }

  //
  async getAllOrders() {
    return this.orderModel.find({});
  }

  // Update order status
  async updateOrderStatus(orderId: string, status: string) {
    if (!orderId) {
      throw new BadRequestException("Order ID is required");
    }
    if (!status) {
      throw new BadRequestException("Status is required");
    }
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException("Order not found");
    }

    order.status = status;


    await order.save();
    console.log("Fetched order:", order.toObject());
    console.log("Order status updated:", order);
    console.log("Order status updated:", order.status);
    // Gửi tin nhắn đến RabbitMQ để thông báo về việc cập nhật trạng thái đơn hàng
    return order;
  }

}
