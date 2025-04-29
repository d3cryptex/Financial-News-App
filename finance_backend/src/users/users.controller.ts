import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UnauthorizedException, BadRequestException, UploadedFile, UseInterceptors, ParseUUIDPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'; 
import { diskStorage } from 'multer'; 
import { extname } from 'path';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { ConfigService } from '@nestjs/config';

const avatarStorage = diskStorage({
  destination: './uploads/avatars', 
  filename: (req, file, callback) => {
    const userId = (req as any).params?.id;
    if (!userId) {
      return callback(new Error('User ID missing from request parameters'), '');
    }
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = extname(file.originalname);
    const filename = `${userId}-${uniqueSuffix}${extension}`;
    callback(null, filename);
  },
});

function imageFileFilter(req, file, callback) {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      return callback(new BadRequestException('Only image files (JPG, PNG, GIF) are allowed!'), false);
  }
  callback(null, true);
}

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService, private readonly configService: ConfigService) {}

    @Post()
    async create(@Body() body: { name: string; email: string; password: string }): Promise<User> {
        return this.usersService.createUser(body.name, body.email, body.password);
    }

    @Post('google')
    async createGoogleUser(@Body() body: { name: string; email: string; googleid: string, picture: string }): Promise<User> {
        return this.usersService.createGoogleUser(body.name, body.email, body.googleid, body.picture);
    }

    @Post('validate')
    async validateUser(@Body() body: { email: string; password: string }): Promise<User> {
      const user = await this.usersService.validateUser(body.email, body.password);
  
      if (!user) {
        throw new UnauthorizedException('Invalid credentials or user not found');
      }

      return user;
    }

    @Get('check-username')
    async checkUsernameExists(@Query('name') name: string): Promise<boolean> {
      return await this.usersService.checkUsernameExists(name);
    }
  
    @Get('check-email')
    async checkEmailExists(@Query('email') email: string): Promise<boolean> {
      return await this.usersService.checkEmailExists(email);
    }

    @Get('check-email-linked')
    async checkEmailLinkedToGoogle(@Query('email') email: string): Promise<boolean> {
      return await this.usersService.checkEmailLinkedToGoogle(email);
    }

    @Get()
    async findAll(): Promise<User[]> {
        return this.usersService.findAll();
    }

    @Get(':id')
    async findOneById(@Param('id') id: string): Promise<User> {
      return this.usersService.findOneById(id);
    }
  
    @Put(':id')
    async update(@Param('id') id: string, @Body() userData: any): Promise<User> {
      return this.usersService.updateUser(id, userData);
    }
  
    @Patch(':id')
    async partialUpdate(@Param('id') id: string, @Body() userData: any): Promise<User> {
      return this.usersService.partialUpdateUser(id, userData);
    }
  
    @Delete(':id')
    async remove(@Param('id') id: string): Promise<{ message: string }> {
      await this.usersService.removeUser(id);
      return { message: `User with id ${id} deleted successfully.` };
    }

    @Post(':id/change-password')
    async changeUserPassword(
      @Param('id') id: string,
      @Body() body: { currentPassword?: string; newPassword?: string } 
    ): Promise<{ message: string }> {

      if (!body.currentPassword || typeof body.currentPassword !== 'string') {
          throw new BadRequestException('Current password is required and must be a string.');
      }
      if (!body.newPassword || typeof body.newPassword !== 'string') {
          throw new BadRequestException('New password is required and must be a string.');
      }
      if (body.newPassword.length < 6) {
          throw new BadRequestException('New password must be at least 6 characters long.');
      }

      await this.usersService.changePassword(
        id,
        body.currentPassword,
        body.newPassword
      );

      return { message: 'Password changed successfully.' };
    }

    @Post(':id/avatar')
    @UseInterceptors(FileInterceptor('avatar', { 
        storage: avatarStorage, 
        fileFilter: imageFileFilter,
        limits: { fileSize: 5 * 1024 * 1024 } 
    }))
    async uploadAvatar(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File, ): Promise<{ avatar_url: string }> {
        if (!file) {
            throw new BadRequestException('Avatar file is required.');
        }
      
        const relativePath = `/public/avatars/${file.filename}`;

        const backendBaseUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000'); 

        const fullFileUrl = `${backendBaseUrl}${relativePath}`;

        console.log(`Generated full avatar URL for response: ${fullFileUrl}`);
        
        try {
            await this.usersService.partialUpdateUser(id, { avatar_url: fullFileUrl  }); 
            console.log(`Avatar updated for user ${id} to ${fullFileUrl }`);
            return { avatar_url: fullFileUrl  }; 
        } catch(error) {
             console.error(`Failed to update avatar URL for user ${id}`, error)
             throw error; 
        }
    }
}
