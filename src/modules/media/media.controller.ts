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
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media.dto';
import { UpdateMediaDto } from './dto/update-media.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly cloudflareService: CloudflareService,
  ) {}

  @Post()
  async create(@Body() createMediaDto: CreateMediaDto) {
    try {
      return await this.mediaService.create(createMediaDto);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to create media';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get()
  async findAll() {
    return this.mediaService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mediaService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateMediaDto: UpdateMediaDto,
  ) {
    return this.mediaService.update(id, updateMediaDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.mediaService.remove(id);
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.mediaService.findByUser(userId);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedMimes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|pdf|doc|docx|txt/;
        const extname = allowedMimes.test(file.originalname.toLowerCase().split('.').pop() || '');
        const mimetype = allowedMimes.test(file.mimetype);
        if (mimetype && extname) {
          return cb(null, true);
        }
        cb(new Error('Invalid file type!'), false);
      },
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user?: { id: string } },
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
    const fileUrl = await this.cloudflareService.uploadFile(file.buffer, filename, 'media');

    const createMediaDto: CreateMediaDto = {
      user_id: req.user?.id || '',
      filename: file.originalname,
      file_path: `media/${filename}`,
      file_url: fileUrl,
      mime_type: file.mimetype,
      file_size: file.size,
    };

    return await this.mediaService.create(createMediaDto);
  }
}
