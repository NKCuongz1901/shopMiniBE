import { Body, Controller, Get, Param, Post } from '@nestjs/common';
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

}
