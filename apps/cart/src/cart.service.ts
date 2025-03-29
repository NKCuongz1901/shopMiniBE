import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cart } from './schema/cart.schema';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CartService {
  private productServiceUrl?: string;
  constructor(
    @InjectModel(Cart.name) private CartModel: Model<Cart>,
    private configService: ConfigService,
    private httpService: HttpService,
  ) {
    this.productServiceUrl = this.configService.get<string>('PRODUCT_SERVICE_URL')
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
