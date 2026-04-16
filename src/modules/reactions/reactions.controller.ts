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
  ParseIntPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ReactionsService } from './reactions.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('reactions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  @Audit({ action: 'CREATE_REACTION', resource: 'Reaction' })
  async create(@Body() createReactionDto: CreateReactionDto) {
    try {
      return await this.reactionsService.create(createReactionDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('post/:postId')
  async findByPost(@Param('postId') postId: string) {
    return this.reactionsService.findByPost(postId);
  }

  @Get('comment/:commentId')
  async findByComment(@Param('commentId') commentId: string) {
    return this.reactionsService.findByComment(commentId);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE_REACTION', resource: 'Reaction' })
  async remove(@Param('id') id: string) {
    return this.reactionsService.remove(id);
  }
}
