import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cart } from './schema/cart.schema';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { RabbitMQService } from 'libs/rabbitmq/rabbitmq.service';
import { QUEUE_ORDER_TO_CART } from 'libs/rabbitmq/rabbitmq.constants';

@Injectable()
export class CartService implements OnModuleInit {
  private productServiceUrl?: string;
  constructor(
    @InjectModel(Cart.name) private CartModel: Model<Cart>,
    private configService: ConfigService,
    private httpService: HttpService,
    private rabbitMQService: RabbitMQService,
  ) {
    this.productServiceUrl = this.configService.get<string>('PRODUCT_SERVICE_URL')
  }

  async onModuleInit() {
    await this.rabbitMQService.consumeMessage(QUEUE_ORDER_TO_CART, this.handleOrderMessage.bind(this))
  }

  // Handle receive message from order
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

      // Lấy dữ liệu từ parsedMessage
      const data = parsedMessage.data ? parsedMessage.data : parsedMessage;
      console.log("✅ Dữ liệu cần xử lý:", data);

      const { userId } = data;
      if (!userId) {
        throw new BadRequestException("Missing userId data");
      }
      // Delete cart
      await this.CartModel.deleteOne({ userId: new Types.ObjectId(userId) });
      console.log("Cart is already delete");

    } catch (error) {
      console.log("Something be wrong", error);
    }
  }

  // Fetch product data 
  private async fetchProductData(productId) {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.productServiceUrl}/${productId}`)
      );
      return response.data;
    } catch (error) {
      throw new NotFoundException("Cant not found this product")
    }
  }

  // Add to cart
  async addToCart(userId: string, productId: string, quantity: number) {
    const product = await this.fetchProductData(productId);
    if (!product) {
      throw new NotFoundException("Cant find this product");
    }

    if (product.quantity < quantity) {
      throw new BadRequestException("Quantity is not enough to add to cart")
    }
    const userObjectId = new Types.ObjectId(userId);
    const productObjectId = new Types.ObjectId(productId);

    let cart = await this.CartModel.findOne({ userId: userObjectId });
    if (!cart) {
      cart = new this.CartModel({ userId: userObjectId, items: [], totalPrice: 0 });
    }

    const existingCart = cart.items.find((item) => item.productId.equals(productObjectId));
    if (existingCart) {
      existingCart.quantity += quantity;
      existingCart.total = existingCart.quantity * product.price;
    } else {
      cart.items.push({
        productId: productObjectId,
        quantity,
        price: product.price,
        total: product.price * quantity
      });
    }
    cart.totalPrice = cart.items.reduce((sum, item) => sum + item.total, 0);
    await cart.save();
    return cart;
  }

  // Get cart
  async getCart(userId: string) {
    return await this.CartModel.findOne({ userId: new Types.ObjectId(userId) }).populate('items.productId');

  }

  // Remove cart
  async removeAllCart(userId: string) {
    return await this.CartModel.findByIdAndUpdate({ userId: new Types.ObjectId(userId) });
  }



}
