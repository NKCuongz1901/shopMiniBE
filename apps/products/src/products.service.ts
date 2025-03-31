import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Product } from './schemas/product.schema';
import { Document, Model, Types } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { SearchProductDto } from './dto/search-product.dto';
import { RabbitMQService } from 'libs/rabbitmq/rabbitmq.service';
import { QUEUE_ORDER_TO_PRODUCT } from 'libs/rabbitmq/rabbitmq.constants';

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(
    @InjectModel(Product.name) private productModel: Model<Product>,
    private rabbitMQService: RabbitMQService
  ) { }

  async onModuleInit() {
    await this.rabbitMQService.consumeMessage(QUEUE_ORDER_TO_PRODUCT, this.handleOrderMessage.bind(this))
  }

  // Xử lý message từ Order Service
  private async handleOrderMessage(msg: any) {
    console.log(" Nhận message từ Order Service:", msg);

    if (!msg) {
      console.error(" Lỗi: msg  bị undefined.");
      return;
    }
    try {
      // Chuyển `msg` (mảng byte) thành Buffer rồi parse JSON
      const rawMessage = Buffer.from(msg).toString("utf-8");
      console.log("✅ Dữ liệu đã chuyển thành chuỗi:", rawMessage);

      const parsedMessage = JSON.parse(rawMessage);
      console.log("✅ Parsed message:", parsedMessage);

      // Lấy dữ liệu từ parsedMessage
      const data = parsedMessage.data ? parsedMessage.data : parsedMessage;
      console.log("✅ Dữ liệu cần xử lý:", data);

      // Kiểm tra dữ liệu hợp lệ
      const { productId, quantity } = data;
      if (!productId || !quantity) {
        throw new BadRequestException(`Thiếu dữ liệu cần thiết: productId hoặc quantity`);
      }

      // Tìm sản phẩm trong database
      const product = await this.productModel.findById(new Types.ObjectId(productId));
      if (!product) {
        throw new NotFoundException(`Không tìm thấy sản phẩm có ID: ${productId}`);
      }

      // Kiểm tra số lượng còn lại
      if (product.quantity < quantity) {
        throw new BadRequestException(`Not enough stock of ${product.productName}`);
      }

      // Cập nhật số lượng
      product.quantity -= quantity;
      await product.save();

      console.log(`✅ Already update quantity of ${product.productName}. Quantity left is : ${product.quantity}`);
    } catch (error) {
      console.error("❌ Lỗi xử lý message:", error);
    }
  }

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
