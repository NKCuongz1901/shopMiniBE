import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Order } from './schema/order.schema';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { CreateOrderDto } from './dto/create-order.dto';


@Injectable()
export class OrderService {
  private productServiceUrl?: string;
  private cartServiceUrl?: string;
  constructor(
    @InjectModel(Order.name) private orderModel: Model<Order>,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.productServiceUrl = this.configService.get('PRODUCT_SERVICE_URL');
    this.cartServiceUrl = this.configService.get('CART_SERVICE_URL');
  }

  // fetch product data
  private async fetchProductData(productId: string) {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.productServiceUrl}/${productId}`)
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
        this.httpService.get(`${this.cartServiceUrl}/${userId}`)
      );
      return response.data;
    } catch (error) {
      throw new NotFoundException("Cart is empty");
    }
  }

  // Place order
  async placeOrder(userId: string, createOrderDto: CreateOrderDto) {
    const { shippingAddress, phone, paymentMethod } = createOrderDto;

    const cart = await this.fetchCartData(userId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Your cart is empty");
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
    for (const item of cart.items) {
      const product = await this.fetchProductData(item.productId);
      if (!product) {
        throw new NotFoundException("Cant find this product");
      }
      if (product.quantity < item.quantity) {
        throw new BadRequestException("Not enough stock for this product")
      }

      orderItems.push({
        productId: product._id,
        name: product.productName,
        image: product.image,
        quantity: item.quantity,
        price: product.price,
        total: item.quantity * product.price,
      });
      totalPrice += item.quantity * product.price;
    }

    const newOrder = new this.orderModel({
      userId: new Types.ObjectId(userId),
      items: orderItems,
      totalPrice,
      paymentMethod,
      shippingAddress,
      phone,
      status: "PENDING"
    })
    await newOrder.save()
    return newOrder;
  }

  // Get order by userID
  async getUserById(userId: string) {
    return this.orderModel.findOne({ userId: new Types.ObjectId(userId) });
  }

}
