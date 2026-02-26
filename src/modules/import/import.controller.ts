import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ImportService } from './import.service';
import { ImportMediaService } from './import-media.service';
import {
  ImportDataDto,
  ValidateResponseDto,
  ImportAuthorDto,
  ImportPostDto,
} from './dto/import.dto';
import { ImportMediaDto } from './dto/import-media.dto';

@Controller('import')
export class ImportController {
  constructor(
    private readonly importService: ImportService,
    private readonly importMediaService: ImportMediaService,
  ) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateImportData(
    @Body() data: ImportDataDto,
  ): Promise<ValidateResponseDto> {
    return this.importService.validateImportData(data);
  }

  @Post('categories')
  @HttpCode(HttpStatus.OK)
  async importCategories(@Body('categories') categories: string[]) {
    return this.importService.importCategories(categories);
  }

  @Post('authors')
  @HttpCode(HttpStatus.OK)
  async importAuthors(@Body('authors') authors: ImportAuthorDto[]) {
    return this.importService.importAuthors(authors);
  }

  @Post('posts')
  @HttpCode(HttpStatus.OK)
  async importPosts(@Body('posts') posts: ImportPostDto[]) {
    return this.importService.importPosts(posts);
  }

  @Post('all')
  @HttpCode(HttpStatus.OK)
  async importAll(@Body() data: ImportDataDto) {
    return this.importService.importAll(data);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MEDIA IMPORT ENDPOINTS (Phases 1–4)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Phase 1: Parse WordPress XML — dry-run to preview attachments and featured image mappings
   */
  @Post('media/parse')
  @HttpCode(HttpStatus.OK)
  async parseMedia(@Body('xmlFilePath') xmlFilePath: string) {
    return this.importMediaService.parseMedia(xmlFilePath);
  }

  /**
   * Phase 2: Download images from WordPress → Upload to Cloudflare R2 → Create Media records
   * Idempotent — safe to re-run. Skips already-imported attachments via wp_attachment_id check
   */
  @Post('media/sync')
  @HttpCode(HttpStatus.OK)
  async syncMedia(@Body() dto: ImportMediaDto) {
    return this.importMediaService.syncMedia(dto);
  }

  /**
   * Phase 3: Rewrite post content HTML — converts shortcodes and replaces WordPress URLs with Cloudflare URLs
   */
  @Post('media/rewrite')
  @HttpCode(HttpStatus.OK)
  async rewriteContent(@Body('batchSize') batchSize?: number) {
    return this.importMediaService.rewriteContent(batchSize);
  }

  /**
   * Phase 4: Set featured_image on posts and create PostMedia junction records
   */
  @Post('media/featured')
  @HttpCode(HttpStatus.OK)
  async linkFeaturedImages(@Body('xmlFilePath') xmlFilePath: string) {
    return this.importMediaService.linkFeaturedImages(xmlFilePath);
  }

  /**
   * Full pipeline: Parse XML → Sync to R2 → Rewrite content → Link featured images
   */
  @Post('media/all')
  @HttpCode(HttpStatus.OK)
  async importAllMedia(@Body() dto: ImportMediaDto) {
    return this.importMediaService.importAllMedia(dto);
  }
}
