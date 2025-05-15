import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CartService } from './cart.service';


@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  @Post()
  async addToCart(@Body() body: { userId: string, productId: string, quantity: number }) {
    return this.cartService.addToCart(body.userId, body.productId, body.quantity);
  }

  @Get(':userId')
  async getCart(@Param('userId') userId: string) {
    return this.cartService.getCart(userId);
  }

   @Patch('update')
  async updateCart(@Body() body: { userId: string; productId: string; quantity: number }) {
    return this.cartService.updateCartItemQuantity(body.userId, body.productId, body.quantity);
  }

  @Delete('remove')
  async removeAllCart(@Body() body: {userId: string}) {
    return this.cartService.removeAllCart(body.userId);
  }

  @Delete('remove-product')
  async removeProductFromCart(@Body() body: { userId: string; productId: string}) {
    return this.cartService.removeProductFromCart(body.userId, body.productId);
  }


}
