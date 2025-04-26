import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schemas';
import mongoose, { Model } from 'mongoose';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
  ) { }

  getHello(): string {
    return 'Hello World!';
  }
  // Function tao access_token
  async generateAccessToken(user: any) {
    const payload = { sub: user._id, email: user.email, role: user.role };
    return payload;
  }

  async findUserByEmail(email: string) {
    return await this.userModel.findOne({ email })
  }

  async getAllUsers():Promise<User[]> {
    return await this.userModel.find()
  }

  // tạo user
  // async createUser() {
  //   const user = new this.userModel({
  //     name: "Nguyen Van A",
  //     email: "
  // async updateUser(id: string, updateUserDto: UpdateUserDto): Promise<User> {
  //     const updatedUser = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true });
  //     if (!updatedUser) throw new NotFoundException("Cant not found this product");
  //     return updatedUser;
  //   }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const userToUpdate = await this.userModel.findById(id);
    
    if (!userToUpdate) {
      throw new BadRequestException(`Người dùng với ID ${id} không tồn tại`);
    }
  
    const updatedUser = await this.userModel.updateOne(
      { _id: id },
      {
        $set: {
          ...updateUserDto,
          updatedBy: {
            _id: id,
            email: updateUserDto.email,
          },
        },
      }
    );
    return updatedUser;
  }
  

  async removeUser(id: string) {
    console.log("ID:", id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }
  
    const foundUser = await this.userModel.findById(id);
    if (!foundUser) {
      throw new BadRequestException('Không tìm thấy tài khoản người dùng');
    }
  
    if (foundUser.email === "trongthien@gmail.com") {
      throw new BadRequestException('Không thể xóa tài khoản admin');
    }
  
    await this.userModel.findByIdAndDelete(id);
    return { success: true, message: 'Tài khoản đã được xóa thành công' };
  }

  async getUserById(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID không hợp lệ');
    }
  
    const foundUser = await this.userModel.findById(id);
    if (!foundUser) {
      throw new BadRequestException('Không tìm thấy tài khoản người dùng');
    }
  
    return foundUser;
  }
  


}
