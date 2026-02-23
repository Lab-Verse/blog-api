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
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('questions')
@UseGuards(JwtAuthGuard)
@UseInterceptors(AuditInterceptor)
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @Audit({ action: 'CREATE_QUESTION', resource: 'Question' })
  async create(@Body() createQuestionDto: CreateQuestionDto, @Req() req: Request) {
    try {
      // Extract actual user_id from JWT token and override any placeholder value from frontend
      const currentUser = (req.user as any);
      if (currentUser && currentUser.id) {
        createQuestionDto.user_id = currentUser.id;
      }
      
      return await this.questionsService.create(createQuestionDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    return this.questionsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE_QUESTION', resource: 'Question' })
  async update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
    @Req() req: Request,
  ) {
    // Ensure user_id is set from authenticated user if provided in request
    const currentUser = (req.user as any);
    if (currentUser && currentUser.id && updateQuestionDto.user_id === 'current-user') {
      updateQuestionDto.user_id = currentUser.id;
    }
    
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE_QUESTION', resource: 'Question' })
  async remove(@Param('id') id: string) {
    return this.questionsService.remove(id);
  }

  @Patch(':id/increment-views')
  async incrementViews(@Param('id') id: string) {
    return this.questionsService.incrementViews(id);
  }
}
