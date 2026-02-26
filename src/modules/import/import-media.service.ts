import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Media } from '../media/entities/media.entity';
import { Post } from '../posts/entities/post.entity';
import { PostMedia } from '../post-media/entities/post-media.entity';
import { CloudflareService } from '../../common/services/cloudflare.service';
import {
  parseWordPressXml,
  extractContentImageUrls,
  WpParseResult,
} from './utils/wordpress-xml-parser';
import { rewritePostContent } from './utils/content-rewriter';
import {
  ImportMediaDto,
  ImportMediaParseResultDto,
  ImportMediaSyncResultDto,
  ImportMediaRewriteResultDto,
  ImportMediaFeaturedResultDto,
  ImportMediaFullResultDto,
} from './dto/import-media.dto';

@Injectable()
export class ImportMediaService {
  private readonly logger = new Logger(ImportMediaService.name);

  /** URL rewrite map: old WordPress URL → new Cloudflare URL */
  private urlRewriteMap = new Map<string, string>();

  /** Cached parse result for the current import session */
  private cachedParseResult: WpParseResult | null = null;

  constructor(
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(PostMedia)
    private postMediaRepository: Repository<PostMedia>,
    private cloudflareService: CloudflareService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 1: THE MAP — Parse XML and build lookup structures
  // ═══════════════════════════════════════════════════════════════════════════

  parseMedia(xmlFilePath: string): ImportMediaParseResultDto {
    this.logger.log('Phase 1: Parsing WordPress XML...');

    const parseResult = parseWordPressXml(xmlFilePath);
    this.cachedParseResult = parseResult;

    const attachments = Array.from(parseResult.attachmentMap.values()).map(
      (att) => ({
        wpId: att.wpId,
        url: att.url,
        filename: att.filename,
        postParent: att.postParent,
      }),
    );

    const featuredImageMappings = Array.from(
      parseResult.featuredImageMap.entries(),
    ).map(([postWpId, attachmentWpId]) => ({
      postWpId,
      attachmentWpId,
      attachmentUrl: parseResult.attachmentMap.get(attachmentWpId)?.url,
    }));

    return {
      totalAttachments: parseResult.stats.totalAttachments,
      totalPostsWithFeaturedImage:
        parseResult.stats.totalPostsWithFeaturedImage,
      totalPosts: parseResult.stats.totalPosts,
      attachments,
      featuredImageMappings,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 2: THE SYNC — Download from WordPress → Upload to R2 → Media records
  // ═══════════════════════════════════════════════════════════════════════════

  async syncMedia(dto: ImportMediaDto): Promise<ImportMediaSyncResultDto> {
    this.logger.log('Phase 2: Syncing media to Cloudflare R2...');

    // Parse XML if not cached
    if (!this.cachedParseResult) {
      parseWordPressXml(dto.xmlFilePath);
      this.cachedParseResult = parseWordPressXml(dto.xmlFilePath);
    }
    const { attachmentMap } = this.cachedParseResult;

    // Also find variant URLs referenced in post content
    const posts = await this.postRepository.find({
      select: ['content'],
      where: { guid: Like('https://twa.com.pk/%') },
    });
    const contents = posts.map((p) => p.content).filter(Boolean);
    const { allUrls, variantToOriginalUrl } = extractContentImageUrls(contents);

    this.logger.log(
      `Found ${allUrls.size} unique WordPress URLs in post content, ` +
        `${variantToOriginalUrl.size} variant URLs`,
    );

    const batchSize = dto.batchSize || 10;
    let synced = 0;
    let skipped = 0;
    let failed = 0;
    const failedUrls: string[] = [];

    // ─── Step 1: Sync attachment items (originals) ─────────────────────

    const attachments = Array.from(attachmentMap.values());
    this.logger.log(
      `Processing ${attachments.length} attachment items in batches of ${batchSize}...`,
    );

    for (let i = 0; i < attachments.length; i += batchSize) {
      const batch = attachments.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (att) => {
          // Idempotency check
          const existing = await this.mediaRepository.findOne({
            where: { wp_attachment_id: att.wpId },
          });
          if (existing) {
            // Populate URL rewrite map from existing record
            this.urlRewriteMap.set(
              att.url.replace(/^http:\/\//, 'https://'),
              existing.file_url,
            );
            // Also map http variant
            this.urlRewriteMap.set(att.url, existing.file_url);
            return 'skipped';
          }

          if (dto.dryRun) {
            return 'dry-run';
          }

          // Download from WordPress
          const buffer = await this.downloadFile(att.url);

          // Generate a unique filename with timestamp
          const timestamp = Date.now();
          const safeFilename = att.filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .toLowerCase();
          const uploadFilename = `${timestamp}-${safeFilename}`;

          // Upload to Cloudflare R2
          const cloudflareUrl = await this.cloudflareService.uploadFile(
            buffer,
            uploadFilename,
            'wordpress-media',
          );

          // Create Media record
          const media = this.mediaRepository.create({
            user_id: dto.userId,
            filename: att.filename,
            file_path: `wordpress-media/${uploadFilename}`,
            file_url: cloudflareUrl,
            mime_type: att.mimeType,
            file_size: buffer.length,
            wp_attachment_id: att.wpId,
            original_url: att.url,
          });
          await this.mediaRepository.save(media);

          // Populate URL rewrite map
          const normalizedUrl = att.url.replace(/^http:\/\//, 'https://');
          this.urlRewriteMap.set(normalizedUrl, cloudflareUrl);
          this.urlRewriteMap.set(att.url, cloudflareUrl);

          return 'synced';
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          if (result.value === 'skipped' || result.value === 'dry-run') {
            skipped++;
          } else {
            synced++;
          }
        } else {
          failed++;
          const reason =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);
          failedUrls.push(
            `${batch[results.indexOf(result)]?.url || 'unknown'}: ${reason}`,
          );
          this.logger.warn(`Failed to sync attachment: ${reason}`);
        }
      }

      this.logger.log(
        `Batch ${Math.floor(i / batchSize) + 1}: synced=${synced}, skipped=${skipped}, failed=${failed}`,
      );
    }

    // ─── Step 2: Sync variant images found in post content ─────────────

    // Collect variant URLs that aren't already mapped
    const variantUrlsToSync: Array<{
      variantUrl: string;
      originalUrl: string;
    }> = [];

    for (const [variantUrl, originalUrl] of variantToOriginalUrl) {
      if (!this.urlRewriteMap.has(variantUrl)) {
        variantUrlsToSync.push({ variantUrl, originalUrl });
      }
    }

    if (variantUrlsToSync.length > 0) {
      this.logger.log(
        `Processing ${variantUrlsToSync.length} variant images...`,
      );

      for (let i = 0; i < variantUrlsToSync.length; i += batchSize) {
        const batch = variantUrlsToSync.slice(i, i + batchSize);

        const results = await Promise.allSettled(
          batch.map(async ({ variantUrl, originalUrl }) => {
            // Check if the original was synced — if so, map variant to original's Cloudflare URL
            const originalCfUrl = this.urlRewriteMap.get(originalUrl);
            if (originalCfUrl) {
              this.urlRewriteMap.set(variantUrl, originalCfUrl);
              return 'mapped-to-original';
            }

            if (dto.dryRun) {
              return 'dry-run';
            }

            // Download the variant image directly
            try {
              const buffer = await this.downloadFile(variantUrl);

              const filename = decodeURIComponent(
                variantUrl.split('/').pop() || 'unknown.jpg',
              );
              const timestamp = Date.now();
              const safeFilename = filename
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .toLowerCase();
              const uploadFilename = `${timestamp}-${safeFilename}`;

              const cloudflareUrl = await this.cloudflareService.uploadFile(
                buffer,
                uploadFilename,
                'wordpress-media/variants',
              );

              // Create a media record for the variant
              const media = this.mediaRepository.create({
                user_id: dto.userId,
                filename,
                file_path: `wordpress-media/variants/${uploadFilename}`,
                file_url: cloudflareUrl,
                mime_type: this.inferMimeType(filename),
                file_size: buffer.length,
                wp_attachment_id: `variant-${filename}`,
                original_url: variantUrl,
              });
              await this.mediaRepository.save(media);

              this.urlRewriteMap.set(variantUrl, cloudflareUrl);
              return 'synced';
            } catch {
              // If variant download fails, fall back to mapping to original
              if (originalCfUrl) {
                this.urlRewriteMap.set(variantUrl, originalCfUrl);
                return 'mapped-to-original';
              }
              throw new Error(`Failed to download variant: ${variantUrl}`);
            }
          }),
        );

        for (const result of results) {
          if (result.status === 'fulfilled') {
            if (
              result.value === 'mapped-to-original' ||
              result.value === 'dry-run'
            ) {
              skipped++;
            } else {
              synced++;
            }
          } else {
            failed++;
            failedUrls.push(
              `${batch[results.indexOf(result)]?.variantUrl || 'unknown'}: ${result.reason}`,
            );
          }
        }
      }
    }

    // Also build rewrite map from all existing media records with original_url
    await this.rebuildUrlRewriteMap();

    return {
      success: failed === 0,
      message: `Media sync completed. Synced: ${synced}, Skipped: ${skipped}, Failed: ${failed}`,
      total: attachments.length + variantUrlsToSync.length,
      synced,
      skipped,
      failed,
      failedUrls,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 3: THE LINK — Rewrite post content HTML
  // ═══════════════════════════════════════════════════════════════════════════

  async rewriteContent(batchSize = 50): Promise<ImportMediaRewriteResultDto> {
    this.logger.log('Phase 3: Rewriting post content URLs...');

    // Ensure URL rewrite map is populated
    if (this.urlRewriteMap.size === 0) {
      await this.rebuildUrlRewriteMap();
    }

    if (this.urlRewriteMap.size === 0) {
      return {
        success: true,
        message: 'No URL mappings found. Run sync first.',
        postsProcessed: 0,
        postsModified: 0,
        urlsRewritten: 0,
        captionsConverted: 0,
        videosConverted: 0,
        errors: [],
      };
    }

    this.logger.log(`URL rewrite map has ${this.urlRewriteMap.size} entries`);

    // Find all imported posts (have WordPress guid)
    const posts = await this.postRepository.find({
      where: { guid: Like('https://twa.com.pk/%') },
    });

    // Also find posts with http guid variant
    const httpPosts = await this.postRepository.find({
      where: { guid: Like('http://twa.com.pk/%') },
    });
    const allPosts = [...posts, ...httpPosts];

    let postsProcessed = 0;
    let postsModified = 0;
    let totalUrlsRewritten = 0;
    let totalCaptionsConverted = 0;
    let totalVideosConverted = 0;
    const errors: string[] = [];

    for (let i = 0; i < allPosts.length; i += batchSize) {
      const batch = allPosts.slice(i, i + batchSize);

      for (const post of batch) {
        try {
          postsProcessed++;

          if (
            !post.content ||
            !post.content.includes('twa.com.pk/wp-content/uploads')
          ) {
            continue;
          }

          const result = rewritePostContent(post.content, this.urlRewriteMap);

          if (
            result.urlsRewritten > 0 ||
            result.captionsConverted > 0 ||
            result.videosConverted > 0
          ) {
            post.content = result.content;
            await this.postRepository.save(post);
            postsModified++;
            totalUrlsRewritten += result.urlsRewritten;
            totalCaptionsConverted += result.captionsConverted;
            totalVideosConverted += result.videosConverted;
          }

          // Also create PostMedia records for images found in content
          await this.createPostMediaFromContent(post);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          errors.push(`Post ${post.id} (${post.slug}): ${msg}`);
          this.logger.warn(`Error rewriting post ${post.slug}: ${msg}`);
        }
      }

      this.logger.log(
        `Rewrite batch ${Math.floor(i / batchSize) + 1}: processed=${postsProcessed}, modified=${postsModified}`,
      );
    }

    return {
      success: errors.length === 0,
      message: `Content rewrite completed. Modified: ${postsModified}/${postsProcessed} posts, ${totalUrlsRewritten} URLs rewritten`,
      postsProcessed,
      postsModified,
      urlsRewritten: totalUrlsRewritten,
      captionsConverted: totalCaptionsConverted,
      videosConverted: totalVideosConverted,
      errors,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 4: THE FEATURED — Set featured images and link media to posts
  // ═══════════════════════════════════════════════════════════════════════════

  async linkFeaturedImages(
    xmlFilePath: string,
  ): Promise<ImportMediaFeaturedResultDto> {
    this.logger.log('Phase 4: Linking featured images to posts...');

    // Parse XML if not cached
    if (!this.cachedParseResult) {
      this.cachedParseResult = parseWordPressXml(xmlFilePath);
    }
    const { featuredImageMap, attachmentMap } = this.cachedParseResult;

    // Ensure URL rewrite map is populated
    if (this.urlRewriteMap.size === 0) {
      await this.rebuildUrlRewriteMap();
    }

    let postsUpdated = 0;
    let postMediaCreated = 0;
    const errors: string[] = [];

    // Get all imported posts
    const posts = await this.postRepository.find({
      where: { guid: Like('https://twa.com.pk/%') },
    });

    const httpPosts = await this.postRepository.find({
      where: { guid: Like('http://twa.com.pk/%') },
    });
    const allPosts = [...posts, ...httpPosts];

    for (const post of allPosts) {
      try {
        // Extract WordPress post ID from guid: https://twa.com.pk/?p=1234
        const wpPostId = this.extractWpPostId(post.guid || '');
        if (!wpPostId) continue;

        // Look up featured image attachment ID
        const attachmentWpId = featuredImageMap.get(wpPostId);
        if (!attachmentWpId) continue;

        // Find the media record by wp_attachment_id
        const media = await this.mediaRepository.findOne({
          where: { wp_attachment_id: attachmentWpId },
        });

        if (!media) {
          // Try to get the URL from attachmentMap and look up by original_url
          const attachment = attachmentMap.get(attachmentWpId);
          if (attachment) {
            const mediaByUrl = await this.mediaRepository.findOne({
              where: { original_url: attachment.url },
            });
            if (mediaByUrl) {
              post.featured_image = mediaByUrl.file_url;
              await this.postRepository.save(post);
              postsUpdated++;

              await this.ensurePostMedia(post.id, mediaByUrl.id);
              postMediaCreated++;
              continue;
            }
          }

          errors.push(
            `Post ${post.slug}: attachment ${attachmentWpId} not found in media table`,
          );
          continue;
        }

        // Set featured_image URL
        post.featured_image = media.file_url;
        await this.postRepository.save(post);
        postsUpdated++;

        // Create PostMedia junction record
        await this.ensurePostMedia(post.id, media.id);
        postMediaCreated++;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`Post ${post.slug}: ${msg}`);
        this.logger.warn(
          `Error linking featured image for ${post.slug}: ${msg}`,
        );
      }
    }

    return {
      success: errors.length === 0,
      message: `Featured images linked. Updated: ${postsUpdated} posts, Created: ${postMediaCreated} PostMedia records`,
      postsUpdated,
      postMediaCreated,
      errors,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL PIPELINE — Run all 4 phases in sequence
  // ═══════════════════════════════════════════════════════════════════════════

  async importAllMedia(dto: ImportMediaDto): Promise<ImportMediaFullResultDto> {
    this.logger.log('Starting full media import pipeline...');

    // Clear state
    this.urlRewriteMap.clear();
    this.cachedParseResult = null;

    // Phase 1: Parse
    const parseResult = this.parseMedia(dto.xmlFilePath);
    this.logger.log('Phase 1 complete ✅');

    // Phase 2: Sync
    const syncResult = await this.syncMedia(dto);
    this.logger.log('Phase 2 complete ✅');

    // Phase 3: Rewrite
    const rewriteResult = await this.rewriteContent();
    this.logger.log('Phase 3 complete ✅');

    // Phase 4: Featured
    const featuredResult = await this.linkFeaturedImages(dto.xmlFilePath);
    this.logger.log('Phase 4 complete ✅');

    this.logger.log('Full media import pipeline completed!');

    return {
      parse: parseResult,
      sync: syncResult,
      rewrite: rewriteResult,
      featured: featuredResult,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Download a file from a URL and return the Buffer.
   * Uses native fetch (Node 18+).
   */
  private async downloadFile(url: string): Promise<Buffer> {
    // Try https first, then fall back to http
    const urls = [url.replace(/^http:\/\//, 'https://'), url];

    let lastError: Error | null = null;

    for (const tryUrl of [...new Set(urls)]) {
      try {
        const response = await fetch(tryUrl, {
          signal: AbortSignal.timeout(30000), // 30s timeout
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; BlogImporter/1.0)',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError || new Error(`Failed to download: ${url}`);
  }

  /**
   * Rebuild the URL rewrite map from all Media records that have original_url set.
   */
  private async rebuildUrlRewriteMap(): Promise<void> {
    const mediaRecords = await this.mediaRepository.find({
      select: ['file_url', 'original_url'],
    });

    for (const media of mediaRecords) {
      if (media.original_url && media.file_url) {
        const normalized = media.original_url.replace(/^http:\/\//, 'https://');
        this.urlRewriteMap.set(normalized, media.file_url);
        this.urlRewriteMap.set(media.original_url, media.file_url);
      }
    }

    this.logger.log(
      `Rebuilt URL rewrite map with ${this.urlRewriteMap.size} entries from ${mediaRecords.length} media records`,
    );
  }

  /**
   * Extract WordPress post ID from a guid like https://twa.com.pk/?p=1234
   */
  private extractWpPostId(guid: string): string | null {
    const match = guid.match(/[?&]p=(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Create PostMedia records for images found in post content that are now
   * pointing to Cloudflare URLs.
   */
  private async createPostMediaFromContent(post: Post): Promise<void> {
    if (!post.content) return;

    // Find all Cloudflare URLs in content
    const cfUrls = new Set<string>();
    for (const [, cfUrl] of this.urlRewriteMap) {
      if (post.content.includes(cfUrl)) {
        cfUrls.add(cfUrl);
      }
    }

    for (const cfUrl of cfUrls) {
      const media = await this.mediaRepository.findOne({
        where: { file_url: cfUrl },
      });
      if (media) {
        await this.ensurePostMedia(post.id, media.id);
      }
    }
  }

  /**
   * Create PostMedia junction record if it doesn't already exist.
   */
  private async ensurePostMedia(
    postId: string,
    mediaId: string,
  ): Promise<void> {
    const existing = await this.postMediaRepository.findOne({
      where: { post_id: postId, media_id: mediaId },
    });

    if (!existing) {
      const postMedia = this.postMediaRepository.create({
        post_id: postId,
        media_id: mediaId,
      });
      await this.postMediaRepository.save(postMedia);
    }
  }

  /**
   * Infer MIME type from a filename extension.
   */
  private inferMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      pdf: 'application/pdf',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }
}
