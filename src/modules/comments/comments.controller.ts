import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  UseInterceptors,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('comments')
@UseInterceptors(AuditInterceptor)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'CREATE_COMMENT', resource: 'Comment' })
  async create(@Body() createCommentDto: CreateCommentDto, @Request() req: any) {
    try {
      const commentData = {
        ...createCommentDto,
        user_id: req.user.id,
      };
      return await this.commentsService.create(commentData);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll(
    @Query('postId') postId?: string,
    @Query('post_id') postIdSnake?: string,
  ) {
    const resolvedPostId = postId || postIdSnake;
    if (resolvedPostId) {
      return this.commentsService.findByPostId(resolvedPostId);
    }
    return this.commentsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UPDATE_COMMENT', resource: 'Comment' })
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any,
  ) {
    const comment = await this.commentsService.findOne(id);
    const isAdmin = ['super_admin', 'admin'].includes(req.user?.role?.slug || req.user?.role);
    if (comment.user_id !== req.user.id && !isAdmin) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    return this.commentsService.update(id, updateCommentDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'DELETE_COMMENT', resource: 'Comment' })
  async remove(@Param('id') id: string, @Request() req: any) {
    const comment = await this.commentsService.findOne(id);
    const isAdmin = ['super_admin', 'admin'].includes(req.user?.role?.slug || req.user?.role);
    if (comment.user_id !== req.user.id && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    return this.commentsService.remove(id);
  }

  @Get(':id/replies')
  async getReplies(@Param('id') id: string) {
    return this.commentsService.getReplies(id);
  }
}
