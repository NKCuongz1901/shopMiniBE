import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Post()
  async placeOrder(@Body('userId') userId: string, @Body() createOrderDto: CreateOrderDto) {
    return this.orderService.placeOrder(userId, createOrderDto);
  }

  @Get(':userId')
  async getUserById(@Param('userId') userId: string) {
    return this.orderService.getUserById(userId);
  }

  @Get()
  async getAllOrders() {
    return this.orderService.getAllOrders();
  }


}
