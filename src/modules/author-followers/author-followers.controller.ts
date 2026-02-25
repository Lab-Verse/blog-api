import {
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { AuthorFollowersService } from './author-followers.service';
import { CreateAuthorFollowerDto } from './dto/create-author-follower.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('author-followers')
@UseInterceptors(AuditInterceptor)
export class AuthorFollowersController {
  constructor(
    private readonly authorFollowersService: AuthorFollowersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'FOLLOW_AUTHOR', resource: 'AuthorFollower' })
  async create(@Body() createAuthorFollowerDto: CreateAuthorFollowerDto) {
    try {
      return await this.authorFollowersService.create(createAuthorFollowerDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('followers/:authorId')
  async getFollowers(@Param('authorId') authorId: string) {
    return this.authorFollowersService.getFollowers(authorId);
  }

  @Get('following/:userId')
  async getFollowing(@Param('userId') userId: string) {
    return this.authorFollowersService.getFollowing(userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UNFOLLOW_AUTHOR', resource: 'AuthorFollower' })
  async remove(@Param('id') id: string) {
    if (!id || id.trim() === '') {
      throw new HttpException('Invalid id parameter', HttpStatus.BAD_REQUEST);
    }
    return this.authorFollowersService.remove(id);
  }
}
