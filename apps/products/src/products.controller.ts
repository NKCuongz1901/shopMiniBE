import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { isValidObjectId } from 'mongoose';

@Controller('product')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) { }

  @Post()
  createProduct(@Body() createProductDto: CreateProductDto) {
    return this.productsService.createProduct(createProductDto);
  }

  @Get()
  findAllProduct() {
    return this.productsService.getAllProduct()
  }

  @Get('search')
  async searchProduct(@Query() searchProductDto: SearchProductDto) {
    return this.productsService.searchProduct(searchProductDto);
  }

  @Get(':id')
  findProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.updateProduct(id, updateProductDto);
  }

  // @Delete(':id')
  // deleteProduct(@Param('id') id: string) {
  //   return this.productsService.deleteProduct(id);
  // }
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    await this.productsService.deleteProduct(id);
    return { message: 'Product deleted successfully' };
  }

}
