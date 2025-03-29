import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Document, Model, Types } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';

@Injectable()
export class ProductsService {
  constructor(@InjectModel(Product.name) private productModel: Model<Product>) { }

  // Create product
  async createProduct(createProductDto: CreateProductDto): Promise<Product> {
    const product = new this.productModel(createProductDto);
    return product.save()
  }

  // Find all product
  async getAllProduct(): Promise<Product[]> {
    return this.productModel.find().exec()
  }

  // Find product by id
  async getProductById(id: string): Promise<Product | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }
    return this.productModel.findById(new Types.ObjectId(id)).exec();
  }

  // Update product
  async updateProduct(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const updatedProduct = await this.productModel.findByIdAndUpdate(id, updateProductDto, { new: true });
    if (!updatedProduct) throw new NotFoundException("Cant not found this product");
    return updatedProduct;
  }

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    const product = await this.productModel.findByIdAndDelete(id);
    if (!product) throw new NotFoundException("Cant not find this product")
  }

  // Search Products
  async searchProduct(searchProductDto: SearchProductDto): Promise<(Product & Document)[]> {
    const { productName, category, minPrice, maxPrice, sortBy } = searchProductDto;
    const query: any = {};
    if (productName) query.productName = { $regex: productName, $options: 'i' };
    if (minPrice) query.price = { ...query.price, $gte: minPrice };
    if (maxPrice) query.price = { ...query.price, $lte: maxPrice };
    if (category) query.category = category;

    let sortQuery = {};
    if (sortBy === 'price') sortQuery = { price: 1 };
    if (sortBy === '-price') sortQuery = { price: -1 };

    return this.productModel.find(query).sort(sortQuery).exec();
  }


}
