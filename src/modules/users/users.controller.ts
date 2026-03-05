import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('users')
@UseInterceptors(AuditInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'CREATE_USER', resource: 'User' })
  async create(@Body() createUserDto: CreateUserDto) {
    try {
      return await this.usersService.create(createUserDto);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create user';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('is_columnist') isColumnist?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.usersService.findAll(pageNum, limitNum, search, status, isColumnist === 'true' ? true : undefined);
  }

  @Get('username/:username')
  async findByUsername(@Param('username') username: string) {
    return this.usersService.findByUsername(username);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UPDATE_USER', resource: 'User' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'DELETE_USER', resource: 'User' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Get(':id/profile')
  async getProfile(@Param('id') id: string) {
    try {
      return await this.usersService.getProfile(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        return null;
      }
      throw error;
    }
  }

  @Get(':id/posts')
  async getPosts(@Param('id') id: string) {
    return this.usersService.getPosts(id);
  }

  @Get(':id/drafts')
  async getDrafts(@Param('id') id: string) {
    return this.usersService.getDrafts(id);
  }

  @Get(':id/bookmarks')
  async getBookmarks(@Param('id') id: string) {
    return this.usersService.getBookmarks(id);
  }

  @Get(':id/followers')
  async getFollowers(@Param('id') id: string) {
    return this.usersService.getFollowers(id);
  }

  @Get(':id/following')
  async getFollowing(@Param('id') id: string) {
    return this.usersService.getAllFollowing(id);
  }

  @Get(':id/notifications')
  async getNotifications(@Param('id') id: string) {
    return this.usersService.getNotifications(id);
  }

  @Post(':id/profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('profile_picture', {
      storage: diskStorage({
        destination: './uploads/profile-pictures',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
    }),
  )
  @Audit({ action: 'CREATE_USER_PROFILE', resource: 'UserProfile' })
  async createProfile(
    @Param('id') id: string,
    @Body() createProfileDto: CreateUserProfileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    createProfileDto.user_id = id;
    return this.usersService.createProfile(createProfileDto, file?.filename);
  }

  @Patch(':id/profile')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UPDATE_USER_PROFILE', resource: 'UserProfile' })
  async updateProfile(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateUserProfileDto,
  ) {
    return this.usersService.updateProfile(id, updateProfileDto);
  }

  @Post(':id/profile/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
          return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  @Audit({ action: 'UPLOAD_PROFILE_PICTURE', resource: 'UserProfile' })
  async uploadProfilePicture(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }
    return this.usersService.uploadProfilePicture(id, file.buffer, file.originalname);
  }

  @Delete(':id/profile')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'DELETE_USER_PROFILE', resource: 'UserProfile' })
  async deleteProfile(@Param('id') id: string) {
    return this.usersService.deleteProfile(id);
  }
}
