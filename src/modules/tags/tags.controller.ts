import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { CreateTagTranslationDto } from './dto/tag-translation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('tags')
@UseInterceptors(AuditInterceptor)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'CREATE_TAG', resource: 'Tag' })
  async create(@Body() createTagDto: CreateTagDto) {
    try {
      return await this.tagsService.create(createTagDto);
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll(@Query('locale') locale?: string) {
    return this.tagsService.findAll(locale);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Query('locale') locale?: string) {
    return this.tagsService.findOne(id, locale);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UPDATE_TAG', resource: 'Tag' })
  async update(@Param('id') id: string, @Body() updateTagDto: UpdateTagDto) {
    return this.tagsService.update(id, updateTagDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'DELETE_TAG', resource: 'Tag' })
  async remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }

  @Get(':id/posts')
  async getPosts(@Param('id') id: string) {
    return this.tagsService.getPosts(id);
  }

  // ── Translation endpoints ──

  @Get(':id/translations')
  async getTranslations(@Param('id') id: string) {
    return this.tagsService.getTranslations(id);
  }

  @Put(':id/translations/:locale')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UPSERT_TAG_TRANSLATION', resource: 'TagTranslation' })
  async upsertTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body() dto: CreateTagTranslationDto,
  ) {
    return this.tagsService.upsertTranslation(id, locale, dto);
  }

  @Delete(':id/translations/:locale')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'DELETE_TAG_TRANSLATION', resource: 'TagTranslation' })
  async deleteTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
  ) {
    return this.tagsService.deleteTranslation(id, locale);
  }
}
