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
  // async handleOrderMessage(msg: any) {
  //   console.log("Receive message from order: ", msg);
  //   if (!msg) {
  //     throw new BadRequestException("Msg may be undefined");
  //   }

  //   try {
  //     const rawMessage = Buffer.from(msg).toString("utf-8");
  //     console.log("✅ Dữ liệu đã chuyển thành chuỗi:", rawMessage);

  //     const parsedMessage = JSON.parse(rawMessage);
  //     console.log("✅ Parsed message:", parsedMessage);

  //     // Lấy dữ liệu từ parsedMessage
  //     const data = parsedMessage.data ? parsedMessage.data : parsedMessage;
  //     console.log("✅ Dữ liệu cần xử lý:", data);

  //     const { userId,productIds  } = data;
  //     if (!userId) {
  //       throw new BadRequestException("Missing userId data");
  //     }
  //     if (!productIds || !Array.isArray(productIds)) {
  //     throw new BadRequestException("Missing productIds");
  //   }

  //   // Xóa những item có productId nằm trong productIds
  //   const result = await this.CartModel.updateOne(
  //     { userId: new Types.ObjectId(userId) },
  //     {
  //       $pull: {
  //         items: {
  //           productId: { $in: productIds }
  //         }
  //       }
  //     }
  //   );
  //     // Delete cart
  //     // await this.CartModel.deleteOne({ userId: new Types.ObjectId(userId) });
  //     console.log("Cart is already delete");

  //   } catch (error) {
  //     console.log("Something be wrong", error);
  //   }
  // }

  // Handle receive message from order
async handleOrderMessage(msg: any) {
  console.log("📥 Receive message from order:", msg);

  if (!msg) {
    throw new BadRequestException("Msg may be undefined");
  }

  try {
    const rawMessage = Buffer.from(msg).toString("utf-8");
    const parsedMessage = JSON.parse(rawMessage);
    const data = parsedMessage.data ?? parsedMessage;

    const { userId, productIds } = data;

    if (!userId) {
      throw new BadRequestException("Missing userId");
    }

    if (!productIds || !Array.isArray(productIds)) {
      throw new BadRequestException("Missing productIds");
    }

    const cart = await this.CartModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!cart) {
      console.log("🛒 No cart found for user, nothing to do.");
      return;
    }

    // Loại bỏ các item có productId nằm trong productIds
    cart.items = cart.items.filter(
      (item) => !productIds.includes(item.productId.toString())
    );

    if (cart.items.length === 0) {
      // Nếu giỏ hàng trống sau khi xóa → xóa luôn cart
      await this.CartModel.deleteOne({ _id: cart._id });
      console.log("🗑️ All items removed, cart deleted.");
    } else {
      // Nếu vẫn còn sản phẩm → cập nhật lại cart
      await cart.save();
      console.log("🧹 Selected items removed, cart updated.");
    }
  } catch (error) {
    console.error("❌ Error handling cart message from order:", error);
  }
}


  // Fetch product data 
  private async fetchProductData(productId) {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.productServiceUrl}/${productId}`,{
          headers: {
              'x-internal-api-key': process.env.INTERNAL_API_KEY || 'my-secret-key', // thêm header
          },
      })
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
    const userObjectId = new Types.ObjectId(userId);
    const cart = await this.CartModel.findOne({ userId: userObjectId });
    if (!cart) {
      throw new NotFoundException("Cart not found");
    }

    await this.CartModel.deleteOne({ userId: userObjectId });
    return { message: "Cart deleted successfully" };
  }

  // Update quantity for a specific product in the cart
async updateCartItemQuantity(userId: string, productId: string, newQuantity: number) {
  const product = await this.fetchProductData(productId);
  if (!product) {
    throw new NotFoundException("Product not found");
  }

  const userObjectId = new Types.ObjectId(userId);
  const productObjectId = new Types.ObjectId(productId);

  const cart = await this.CartModel.findOne({ userId: userObjectId });
  if (!cart) {
    throw new NotFoundException("Cart not found");
  }

  const itemIndex = cart.items.findIndex((item) => item.productId.equals(productObjectId));
  if (itemIndex === -1) {
    throw new NotFoundException("Product not found in cart");
  }

  if (newQuantity === 0) {
    // Xoá sản phẩm khỏi giỏ
    cart.items.splice(itemIndex, 1);
  } else {
    if (newQuantity < 0) {
      throw new BadRequestException("Quantity must be at least 0");
    }

    if (product.quantity < newQuantity) {
      throw new BadRequestException("Not enough stock available");
    }

    const item = cart.items[itemIndex];
    const price = item.price ?? 0;

    item.quantity = newQuantity;
    item.total = newQuantity * price;
  }

  // Cập nhật tổng tiền
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.total, 0);

  await cart.save();
  return cart;
}

  async removeProductFromCart(userId: string, productId: string) {
  const userObjectId = new Types.ObjectId(userId);
  const productObjectId = new Types.ObjectId(productId);

  const cart = await this.CartModel.findOne({ userId: userObjectId });
  if (!cart) {
    throw new NotFoundException("Cart not found");
  }

  // Xoá sản phẩm khỏi giỏ hàng
  cart.items = cart.items.filter((item) => !item.productId.equals(productObjectId));

  // Nếu không còn sản phẩm nào => xoá luôn cart
  if (cart.items.length === 0) {
    await this.CartModel.deleteOne({ userId: userObjectId });
    return { message: "Cart is empty, deleted successfully" };
  }

  // Cập nhật lại totalPrice và lưu
  cart.totalPrice = cart.items.reduce((sum, item) => sum + item.total, 0);
  await cart.save();

  return cart;
}






}
