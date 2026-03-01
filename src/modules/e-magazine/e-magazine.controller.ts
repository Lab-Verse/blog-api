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
  UseInterceptors,
  UploadedFiles,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { EMagazineService } from './e-magazine.service';
import { CreateEMagazineDto } from './dto/create-e-magazine.dto';
import { UpdateEMagazineDto } from './dto/update-e-magazine.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('e-magazines')
export class EMagazineController {
  constructor(private readonly eMagazineService: EMagazineService) {}

  /**
   * POST /e-magazines — Create a new e-magazine issue.
   * Multipart form: cover_image (optional image), pdf_file (required PDF), + JSON fields.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover_image', maxCount: 1 },
        { name: 'pdf_file', maxCount: 1 },
      ],
      {
        fileFilter: (req, file, cb) => {
          if (file.fieldname === 'pdf_file') {
            if (file.mimetype !== 'application/pdf') {
              return cb(new Error('Only PDF files are allowed'), false);
            }
          }
          if (file.fieldname === 'cover_image') {
            if (!file.mimetype.startsWith('image/')) {
              return cb(new Error('Only image files are allowed for cover'), false);
            }
          }
          cb(null, true);
        },
        limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
      },
    ),
  )
  async create(
    @Body() dto: CreateEMagazineDto,
    @UploadedFiles()
    files: { cover_image?: Express.Multer.File[]; pdf_file?: Express.Multer.File[] },
    @Req() req: Request & { user?: { id: string } },
  ) {
    try {
      const pdfFile = files?.pdf_file?.[0];
      const coverFile = files?.cover_image?.[0];
      return await this.eMagazineService.create(
        dto,
        req.user?.id || '',
        pdfFile!,
        coverFile,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create e-magazine';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * GET /e-magazines — Public paginated listing.
   */
  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('category') categoryId?: string,
    @Query('search') search?: string,
  ) {
    return this.eMagazineService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      categoryId,
      search,
    });
  }

  /**
   * GET /e-magazines/:slug — Public single issue by slug.
   */
  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.eMagazineService.findBySlug(slug);
  }

  /**
   * PATCH /e-magazines/:id — Update an existing issue.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover_image', maxCount: 1 },
        { name: 'pdf_file', maxCount: 1 },
      ],
      {
        fileFilter: (req, file, cb) => {
          if (file.fieldname === 'pdf_file') {
            if (file.mimetype !== 'application/pdf') {
              return cb(new Error('Only PDF files are allowed'), false);
            }
          }
          if (file.fieldname === 'cover_image') {
            if (!file.mimetype.startsWith('image/')) {
              return cb(new Error('Only image files are allowed for cover'), false);
            }
          }
          cb(null, true);
        },
        limits: { fileSize: 100 * 1024 * 1024 },
      },
    ),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEMagazineDto,
    @UploadedFiles()
    files: { cover_image?: Express.Multer.File[]; pdf_file?: Express.Multer.File[] },
  ) {
    const pdfFile = files?.pdf_file?.[0];
    const coverFile = files?.cover_image?.[0];
    return this.eMagazineService.update(id, dto, pdfFile, coverFile);
  }

  /**
   * DELETE /e-magazines/:id — Delete an issue and its R2 files.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    return this.eMagazineService.remove(id);
  }
}
