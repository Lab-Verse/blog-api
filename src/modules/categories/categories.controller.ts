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
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('categories')
@UseInterceptors(AuditInterceptor)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'CREATE_CATEGORY', resource: 'Category' })
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    try {
      return await this.categoriesService.create(createCategoryDto);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create category';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    const categories = await this.categoriesService.findAll();
    return {
      items: categories,
      total: categories.length,
      page: 1,
      limit: categories.length,
    };
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UPDATE_CATEGORY', resource: 'Category' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'DELETE_CATEGORY', resource: 'Category' })
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.remove(id);
  }

  @Get(':id/posts')
  async getPosts(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.getPosts(id);
  }

  @Get(':id/followers')
  async getFollowers(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoriesService.getFollowers(id);
  }
}
