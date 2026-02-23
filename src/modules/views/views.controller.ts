import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ViewsService } from './views.service';
import { CreateViewDto } from './dto/create-view.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('views')
@UseGuards(JwtAuthGuard)
export class ViewsController {
  constructor(private readonly viewsService: ViewsService) {}

  @Post()
  async create(@Body() createViewDto: CreateViewDto, @Request() req: any) {
    try {
      const forwardedFor = req.headers['x-forwarded-for'];
      const ip =
        req.ip ||
        req.socket?.remoteAddress ||
        (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) ||
        'unknown';

      const userId = req?.user?.id;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const payload: CreateViewDto = {
        ...createViewDto,
        user_id: userId,
        ip_address: createViewDto.ip_address || ip,
      };

      return await this.viewsService.create(payload);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('stats')
  async getStats(
    @Query('viewableType') viewableType?: string,
    @Query('viewableId') viewableId?: string,
  ) {
    return this.viewsService.getStats(viewableType, viewableId);
  }

  @Get('analytics')
  async getAnalytics(
    @Query('viewableType') viewableType?: string,
    @Query('viewableId') viewableId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.viewsService.getAnalytics(
      viewableType,
      viewableId,
      startDate,
      endDate,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.viewsService.findByUser(userId);
  }

  @Get('post/:postId')
  async findByPost(@Param('postId') postId: string) {
    return this.viewsService.findByPost(postId);
  }
}
