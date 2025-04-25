import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { use } from 'passport';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller("auth")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get("user")
  getallUsers() {
    return this.userService.getAllUsers();
  }

   //update
   @Patch('user/:id')
   updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto){
     return this.userService.updateUser(id,updateUserDto);
   }
 
   //delete
   @Delete('user/:id')
   remove(@Param('id') id: string) {
     return this.userService.removeUser(id);
   }

  
}
