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
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Controller('categories')
@UseInterceptors(AuditInterceptor)
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly cloudflareService: CloudflareService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }),
  )
  @Audit({ action: 'CREATE_CATEGORY', resource: 'Category' })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    try {
      // Upload image to R2 if provided
      if (file) {
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
        const imageUrl = await this.cloudflareService.uploadFile(
          file.buffer,
          filename,
          'categories',
        );
        createCategoryDto.image_url = imageUrl;
      }
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
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    }),
  )
  @Audit({ action: 'UPDATE_CATEGORY', resource: 'Category' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Upload image to R2 if provided
    if (file) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
      const imageUrl = await this.cloudflareService.uploadFile(
        file.buffer,
        filename,
        'categories',
      );
      updateCategoryDto.image_url = imageUrl;
    }
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
