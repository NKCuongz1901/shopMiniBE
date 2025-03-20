import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schemas';
import { Model } from 'mongoose';

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
}
