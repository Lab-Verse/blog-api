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
  UseInterceptors,
  Req,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreatePostTranslationDto, UpdatePostTranslationDto } from './dto/post-translation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import { Audit } from '../../common/decorators/audit.decorator';
import { CloudflareService } from '../../common/services/cloudflare.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('posts')
@UseInterceptors(AuditInterceptor)
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
    private readonly cloudflareService: CloudflareService,
  ) {}

  private normalizeArrayField(value: unknown): string[] | undefined {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    if (Array.isArray(value)) {
      const normalized = value
        .map((item) => String(item ?? '').trim())
        .filter(Boolean);
      return normalized.length > 0 ? normalized : [];
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const normalized = parsed
            .map((item) => String(item ?? '').trim())
            .filter(Boolean);
          return normalized.length > 0 ? normalized : [];
        }
        if (typeof parsed === 'string') {
          const single = parsed.trim();
          return single ? [single] : [];
        }
      } catch {
        const normalized = trimmed
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
        return normalized.length > 0 ? normalized : [];
      }
    }

    return undefined;
  }

  private normalizeArrayFieldFromDtoAndRaw(
    dtoValue: unknown,
    rawValue: unknown,
  ): string[] | undefined {
    const normalizedFromRaw = this.normalizeArrayField(rawValue);
    const normalizedFromDto = this.normalizeArrayField(dtoValue);

    if (
      Array.isArray(normalizedFromDto) &&
      normalizedFromDto.length === 0 &&
      Array.isArray(normalizedFromRaw) &&
      normalizedFromRaw.length > 0
    ) {
      return normalizedFromRaw;
    }

    return normalizedFromDto ?? normalizedFromRaw;
  }

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

    // Normalize array fields from both transformed DTO and raw body (multipart/json)
    const rawBody = req.body as Record<string, unknown>;
    createPostDto.tag_ids = this.normalizeArrayFieldFromDtoAndRaw(
      createPostDto.tag_ids,
      rawBody?.tag_ids,
    );
    createPostDto.media_ids = this.normalizeArrayFieldFromDtoAndRaw(
      createPostDto.media_ids,
      rawBody?.media_ids,
    );
    createPostDto.category_ids = this.normalizeArrayFieldFromDtoAndRaw(
      createPostDto.category_ids,
      rawBody?.category_ids,
    );

    // Upload image to Cloudflare R2 if provided
    let imageUrl: string | undefined;
    if (file) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
      imageUrl = await this.cloudflareService.uploadFile(
        file.buffer,
        filename,
        'post-images',
      );
    }

    return this.postsService.create(createPostDto, imageUrl);
  }

  @Get()
  async findAll(
    @Query('category') categoryId?: string,
    @Query('user') userId?: string,
    @Query('limit') limitStr?: string,
    @Query('page') pageStr?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('search') search?: string,
    @Query('locale') locale?: string,
  ) {
    const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 20, 1), 100) : 20;
    const page = pageStr ? Math.max(parseInt(pageStr, 10) || 1, 1) : 1;
    return this.postsService.findAll({ categoryId, userId, limit, page, sortBy, sortOrder, search, locale });
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Query('userId') userId: string) {
    return this.postsService.getStats(userId);
  }

  @Get('search')
  async search(
    @Query('q') query?: string,
    @Query('limit') limitStr?: string,
    @Query('page') pageStr?: string,
    @Query('locale') locale?: string,
  ) {
    const limit = limitStr ? Math.min(Math.max(parseInt(limitStr, 10) || 20, 1), 100) : 20;
    const page = pageStr ? Math.max(parseInt(pageStr, 10) || 1, 1) : 1;
    return this.postsService.search(query || '', limit, page, locale);
  }

  @Get('slug/:slug')
  @Audit({ action: 'VIEW_POST', resource: 'Post' })
  async findBySlug(@Param('slug') slug: string, @Query('locale') locale?: string) {
    const post = await this.postsService.findBySlug(slug, locale);
    return post;
  }

  @Get(':id')
  @Audit({ action: 'VIEW_POST', resource: 'Post' })
  async findOne(@Param('id') id: string, @Query('locale') locale?: string) {
    const post = await this.postsService.findOne(id, locale);
    return post;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('featured_image', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @Audit({ action: 'UPDATE_POST', resource: 'Post' })
  async update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    // Normalize array fields from both transformed DTO and raw body (multipart/json)
    const rawBody = req.body as Record<string, unknown>;
    updatePostDto.tag_ids = this.normalizeArrayFieldFromDtoAndRaw(
      updatePostDto.tag_ids,
      rawBody?.tag_ids,
    );
    updatePostDto.media_ids = this.normalizeArrayFieldFromDtoAndRaw(
      updatePostDto.media_ids,
      rawBody?.media_ids,
    );
    updatePostDto.category_ids = this.normalizeArrayFieldFromDtoAndRaw(
      updatePostDto.category_ids,
      rawBody?.category_ids,
    );

    if (file) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
      const imageUrl = await this.cloudflareService.uploadFile(file.buffer, filename, 'post-images');
      updatePostDto.featured_image = imageUrl;

      const existingMediaIds = Array.isArray(updatePostDto.media_ids)
        ? updatePostDto.media_ids
        : [];
      updatePostDto.media_ids = Array.from(new Set([...existingMediaIds, imageUrl]));
    }

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

  @Post('upload-media')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadMedia(
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request & { user?: { id: string } },
  ) {
    const uploadedUrls = [];
    for (const file of files) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`;
      const url = await this.cloudflareService.uploadFile(
        file.buffer,
        filename,
        'post-images',
      );
      uploadedUrls.push(url);
    }
    return { urls: uploadedUrls };
  }

  // Submit post for admin approval
  @Post(':id/submit-for-approval')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'SUBMIT_POST_FOR_APPROVAL', resource: 'Post' })
  async submitForApproval(@Param('id') id: string) {
    return this.postsService.submitForApproval(id);
  }

  // Admin: Get all pending posts
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async findPendingPosts() {
    return this.postsService.findPendingPosts();
  }

  // Admin: Approve a post
  @Post('admin/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Audit({ action: 'ADMIN_APPROVE_POST', resource: 'Post' })
  async approvePost(@Param('id') id: string) {
    return this.postsService.approvePost(id);
  }

  // Admin: Reject a post
  @Post('admin/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @Audit({ action: 'ADMIN_REJECT_POST', resource: 'Post' })
  async rejectPost(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.postsService.rejectPost(id, reason);
  }

  // ── Translation endpoints ──

  @Get(':id/translations')
  async getTranslations(@Param('id') id: string) {
    return this.postsService.getTranslations(id);
  }

  @Put(':id/translations/:locale')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'UPSERT_POST_TRANSLATION', resource: 'PostTranslation' })
  async upsertTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
    @Body() dto: CreatePostTranslationDto,
  ) {
    return this.postsService.upsertTranslation(id, locale, dto);
  }

  @Delete(':id/translations/:locale')
  @UseGuards(JwtAuthGuard)
  @Audit({ action: 'DELETE_POST_TRANSLATION', resource: 'PostTranslation' })
  async deleteTranslation(
    @Param('id') id: string,
    @Param('locale') locale: string,
  ) {
    return this.postsService.deleteTranslation(id, locale);
  }
}
