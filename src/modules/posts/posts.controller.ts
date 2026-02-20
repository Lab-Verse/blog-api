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
  Req,
  UploadedFile,
} from '@nestjs/common';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { ViewsService } from '../views/views.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Controller('posts')
@UseInterceptors(AuditInterceptor)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly viewsService: ViewsService,
    private readonly cloudflareService: CloudflareService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('featured_image', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max file size
      },
    }),
  )
  @Audit({ action: 'CREATE_POST', resource: 'Post' })
  async create(
    @Body() createPostDto: CreatePostDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request & { user?: { id: string } },
  ) {
    // Auto-assign user_id from JWT token
    if (req.user?.id) {
      createPostDto.user_id = req.user.id;
    }

    // Upload image to Cloudflare R2 if provided
    let imageUrl: string | undefined;
    if (file) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
      imageUrl = await this.cloudflareService.uploadFile(
        file.buffer,
        filename,
        'post-images',
      );
      console.log('✅ Image uploaded to Cloudflare R2:', imageUrl);
    }

    return this.postsService.create(createPostDto, imageUrl);
  }

  @Get()
  async findAll(
    @Query('category') categoryId?: string,
    @Query('user') userId?: string,
  ) {
    return this.postsService.findAll({ categoryId, userId });
  }

  @Get(':id')
  @Audit({ action: 'VIEW_POST', resource: 'Post' })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { user?: { id: string } },
  ) {
    const post = await this.postsService.findOne(id);
    await this.postsService.incrementViews(id);

    // Create view record
    await this.viewsService.create({
      user_id: req.user?.id,
      viewable_type: 'post',
      viewable_id: id,
      ip_address: req.ip || req.socket?.remoteAddress || 'unknown',
    });

    return post;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UPDATE_POST', resource: 'Post' })
  async update(@Param('id') id: string, @Body() updatePostDto: UpdatePostDto) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'DELETE_POST', resource: 'Post' })
  async remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }

  @Get(':id/comments')
  async getComments(@Param('id') id: string) {
    return this.postsService.getComments(id);
  }

  @Get(':id/media')
  async getMedia(@Param('id') id: string) {
    return this.postsService.getMedia(id);
  }

  @Get(':id/tags')
  async getTags(@Param('id') id: string) {
    return this.postsService.getTags(id);
  }

  @Get(':id/reactions')
  async getReactions(@Param('id') id: string) {
    return this.postsService.getReactions(id);
  }
}
