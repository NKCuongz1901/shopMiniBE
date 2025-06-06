import { BadRequestException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Category } from './schemas/category.schema';
import { Model, Types } from 'mongoose';
import { CreateCategoryDto } from './dto/create-category.dto';
import slugify from 'slugify';
import { UpdateCategoryDto } from './dto/update-category.dto';
@Injectable()
export class CategoryService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<Category>) { }

  // Create category
  async createCategory(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const slug = slugify(createCategoryDto.name, { lower: true });
    const category = new this.categoryModel({ ...createCategoryDto, slug });
    return category.save();
  }

  // Get all category
  async findAll(): Promise<Category[]> {
    return this.categoryModel.find()
  }
  // Find category by id
  async findById(id: string): Promise<Category | null> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }
    return this.categoryModel.findById(new Types.ObjectId(id)).exec();

  }

  // Update category
  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const updatedCategory = await this.categoryModel.findByIdAndUpdate(id, updateCategoryDto, { new: true });
    if (!updatedCategory) throw new NotFoundException('Category cant not found');
    return updatedCategory;

  }

  // delete category
  async deleteCategory(id: string): Promise<{ status: number; message: string }> {
    if(!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }
    const category = await this.categoryModel.findByIdAndDelete(id);
  
    if (!category){ throw new NotFoundException('Cant not found this category');}

    return {
      status: HttpStatus.OK,
      message: 'Xoá danh mục thành công'
    };
  }

}
