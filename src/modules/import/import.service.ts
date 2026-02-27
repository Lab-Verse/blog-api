import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User, UserStatus } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Post, PostStatus } from '../posts/entities/post.entity';
import { PostCategory } from '../post-categories/entities/post-category.entity';
import { Tag } from '../tags/entities/tag.entity';
import { PostTag } from '../post-tags/entities/post-tag.entity';
import {
  ImportDataDto,
  ImportResponseDto,
  ValidateResponseDto,
  ImportAuthorDto,
  ImportPostDto,
} from './dto/import.dto';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);
  private authorIdMap: Map<string, string> = new Map();
  private categoryIdMap: Map<string, string> = new Map();
  private tagIdMap: Map<string, string> = new Map();

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(PostCategory)
    private postCategoryRepository: Repository<PostCategory>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(PostTag)
    private postTagRepository: Repository<PostTag>,
    private dataSource: DataSource,
  ) {}

  async validateImportData(data: ImportDataDto): Promise<ValidateResponseDto> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate structure
    if (!data.posts || !Array.isArray(data.posts)) {
      errors.push('Invalid data structure: posts array missing');
    }
    if (!data.categories || !Array.isArray(data.categories)) {
      errors.push('Invalid data structure: categories array missing');
    }
    if (!data.authors || !Array.isArray(data.authors)) {
      errors.push('Invalid data structure: authors array missing');
    }

    // Count statistics
    let draftPosts = 0;
    let publishedPosts = 0;
    let postsWithoutTitle = 0;
    let postsWithoutSlug = 0;

    if (data.posts) {
      for (const post of data.posts) {
        if (post.status === 'draft') draftPosts++;
        if (post.status === 'publish') publishedPosts++;
        if (!post.title || post.title.trim() === '') postsWithoutTitle++;
        if (!post.post_name || post.post_name.trim() === '') postsWithoutSlug++;

        // Validate author reference
        const authorExists = data.authors.find((a) => a.id === post.author.id);
        if (!authorExists) {
          warnings.push(
            `Post ${post.id} references non-existent author ${post.author.id}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        total_posts: data.total_posts || data.posts?.length || 0,
        total_categories: data.categories?.length || 0,
        total_authors: data.authors?.length || 0,
        draft_posts: draftPosts,
        published_posts: publishedPosts,
        posts_without_title: postsWithoutTitle,
        posts_without_slug: postsWithoutSlug,
      },
    };
  }

  async importCategories(categories: string[]): Promise<ImportResponseDto> {
    const imported: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const categoryName of categories) {
      try {
        const slug = this.generateSlug(categoryName);

        // Check if category already exists
        const existing = await this.categoryRepository.findOne({
          where: { slug },
        });

        if (existing) {
          this.categoryIdMap.set(categoryName, existing.id);
          skipped.push(categoryName);
          continue;
        }

        // Create new category
        const category = this.categoryRepository.create({
          name: categoryName,
          slug,
          is_active: true,
        });

        const saved = await this.categoryRepository.save(category);
        this.categoryIdMap.set(categoryName, saved.id);
        imported.push(categoryName);

        this.logger.log(`Imported category: ${categoryName}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : '';
        errors.push(`Failed to import category ${categoryName}: ${message}`);
        this.logger.error(
          `Error importing category ${categoryName}:`,
          stack,
        );
      }
    }

    return {
      success: errors.length === 0,
      message: `Categories import completed. Imported: ${imported.length}, Skipped: ${skipped.length}`,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async importAuthors(authors: ImportAuthorDto[]): Promise<ImportResponseDto> {
    const imported: string[] = [];
    const skipped: string[] = [];
    const errors: string[] = [];

    for (const author of authors) {
      try {
        // Check if user already exists
        const existing = await this.userRepository.findOne({
          where: [{ email: author.email }, { username: author.login }],
        });

        if (existing) {
          this.authorIdMap.set(author.id, existing.id);
          skipped.push(author.login);
          continue;
        }

        // Create new user/author
        const hashedPassword = await this.hashPassword('changeme123');

        const userData = {
          username: author.login,
          email: author.email,
          password: hashedPassword,
          display_name: author.display_name,
          first_name: author.first_name || undefined,
          last_name: author.last_name || undefined,
          login: author.login,
          role: 'author',
          status: UserStatus.ACTIVE,
        };

        const user = this.userRepository.create(userData);
        const saved = await this.userRepository.save(user);
        this.authorIdMap.set(author.id, saved.id);
        imported.push(author.login);

        this.logger.log(`Imported author: ${author.login} (${author.email})`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        const stack = error instanceof Error ? error.stack : '';
        errors.push(`Failed to import author ${author.login}: ${message}`);
        this.logger.error(
          `Error importing author ${author.login}:`,
          stack,
        );
      }
    }

    return {
      success: errors.length === 0,
      message: `Authors import completed. Imported: ${imported.length}, Skipped: ${skipped.length}`,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async importPosts(
    posts: ImportPostDto[],
    batchSize = 100,
  ): Promise<ImportResponseDto> {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process in batches
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);

      for (const postData of batch) {
        try {
          // Generate slug if empty
          let slug = postData.post_name;
          if (!slug || slug.trim() === '') {
            slug = this.generateSlug(postData.title || `post-${postData.id}`);
          }

          // Check if post already exists
          const existing = await this.postRepository.findOne({
            where: { slug },
          });

          if (existing) {
            skipped++;
            continue;
          }

          // Map author ID
          const userId = this.authorIdMap.get(postData.author.id);
          if (!userId) {
            errors.push(
              `Post ${postData.id}: Author ${postData.author.id} not found in mapping`,
            );
            continue;
          }

          // Map status
          const status =
            postData.status === 'publish'
              ? PostStatus.PUBLISHED
              : PostStatus.DRAFT;

          // Parse dates
          const postDateGmt = this.parseDate(postData.post_date_gmt);
          const postModifiedGmt = this.parseDate(postData.post_modified_gmt);
          const publishedAt =
            status === PostStatus.PUBLISHED
              ? this.parseDate(postData.post_date) || new Date()
              : undefined;

          // Get first category for legacy category_id field
          const firstCategoryName = postData.categories[0]?.name;
          const firstCategoryId = firstCategoryName
            ? this.categoryIdMap.get(firstCategoryName)
            : null;

          if (!firstCategoryId) {
            errors.push(`Post ${postData.id}: No valid category found`);
            continue;
          }

          // Create post
          const newPostData = {
            title: postData.title || '',
            slug,
            content: postData.content || '',
            excerpt: postData.excerpt || undefined,
            description: postData.description || undefined,
            guid: postData.guid,
            user_id: userId,
            category_id: firstCategoryId, // Legacy field
            status,
            published_at: publishedAt,
            post_date_gmt: postDateGmt || undefined,
            post_modified_gmt: postModifiedGmt || undefined,
          };

          const post = this.postRepository.create(newPostData);
          const savedPost = await this.postRepository.save(post);

          // Create post-category relationships
          for (const category of postData.categories) {
            const categoryId = this.categoryIdMap.get(category.name);
            if (categoryId) {
              const postCategory = this.postCategoryRepository.create({
                post_id: savedPost.id,
                category_id: categoryId,
              });
              await this.postCategoryRepository.save(postCategory);
            }
          }

          // Import tags
          if (postData.tags && postData.tags.length > 0) {
            await this.importPostTags(savedPost.id, postData.tags);
          }

          imported++;

          if (imported % 50 === 0) {
            this.logger.log(`Progress: ${imported} posts imported...`);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unknown error';
          const stack = error instanceof Error ? error.stack : '';
          errors.push(`Failed to import post ${postData.id}: ${message}`);
          this.logger.error(
            `Error importing post ${postData.id}:`,
            stack,
          );
        }
      }
    }

    return {
      success: errors.length === 0,
      message: `Posts import completed. Imported: ${imported}, Skipped: ${skipped}`,
      imported,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async importPostTags(
    postId: string,
    tags: Array<{ name: string; slug: string }>,
  ): Promise<void> {
    for (const tagData of tags) {
      try {
        let tagId = this.tagIdMap.get(tagData.name);

        if (!tagId) {
          // Check if tag exists
          let tag = await this.tagRepository.findOne({
            where: { slug: tagData.slug },
          });

          if (!tag) {
            // Create new tag
            tag = this.tagRepository.create({
              name: tagData.name,
              slug: tagData.slug,
            });
            tag = await this.tagRepository.save(tag);
          }

          tagId = tag.id;
          this.tagIdMap.set(tagData.name, tagId);
        }

        // Create post-tag relationship
        const postTag = this.postTagRepository.create({
          post_id: postId,
          tag_id: tagId,
        });
        await this.postTagRepository.save(postTag);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        this.logger.warn(
          `Failed to import tag ${tagData.name} for post ${postId}:`,
          message,
        );
      }
    }
  }

  async importAll(data: ImportDataDto): Promise<{
    categories: ImportResponseDto;
    authors: ImportResponseDto;
    posts: ImportResponseDto;
  }> {
    this.logger.log('Starting full import...');

    // Clear ID maps
    this.authorIdMap.clear();
    this.categoryIdMap.clear();
    this.tagIdMap.clear();

    // Import in order: categories -> authors -> posts
    const categoriesResult = await this.importCategories(data.categories);
    this.logger.log('Categories import completed');

    const authorsResult = await this.importAuthors(data.authors);
    this.logger.log('Authors import completed');

    const postsResult = await this.importPosts(data.posts);
    this.logger.log('Posts import completed');

    return {
      categories: categoriesResult,
      authors: authorsResult,
      posts: postsResult,
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private parseDate(dateString: string): Date | null {
    if (!dateString || dateString === '0000-00-00 00:00:00') {
      return null;
    }

    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  /**
   * Import from a JSON file on disk (avoids body size limits for large files).
   */
  async importFromFile(jsonFilePath: string): Promise<{
    categories: ImportResponseDto;
    authors: ImportResponseDto;
    posts: ImportResponseDto;
  }> {
    this.logger.log('Importing from file: ' + jsonFilePath);
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error('File not found: ' + jsonFilePath);
    }
    const raw = fs.readFileSync(jsonFilePath, 'utf-8');
    const data: ImportDataDto = JSON.parse(raw);
    this.logger.log(
      'File parsed: ' + (data.categories?.length || 0) + ' categories, ' +
        (data.authors?.length || 0) + ' authors, ' +
        (data.posts?.length || 0) + ' posts',
    );
    return this.importAll(data);
  }

  /**
   * Backfill guid values on existing posts by matching titles
   * from the WordPress JSON export file.
   */
  async backfillGuids(jsonFilePath: string): Promise<{
    matched: number;
    unmatched: number;
    alreadySet: number;
    errors: string[];
  }> {
    this.logger.log('Backfilling guids from file: ' + jsonFilePath);
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error('File not found: ' + jsonFilePath);
    }
    const raw = fs.readFileSync(jsonFilePath, 'utf-8');
    const data: ImportDataDto = JSON.parse(raw);

    const titleToGuid = new Map<string, string>();
    for (const post of data.posts) {
      if (post.title && post.guid) {
        titleToGuid.set(post.title.trim().toLowerCase(), post.guid);
      }
    }
    this.logger.log('Built title->guid map with ' + titleToGuid.size + ' entries');

    const allPosts = await this.postRepository.find();

    let matched = 0;
    let unmatched = 0;
    let alreadySet = 0;
    const errors: string[] = [];

    for (const post of allPosts) {
      if (post.guid) {
        alreadySet++;
        continue;
      }
      const key = (post.title || '').trim().toLowerCase();
      const guid = titleToGuid.get(key);
      if (guid) {
        post.guid = guid;
        await this.postRepository.save(post);
        matched++;
      } else {
        unmatched++;
      }
    }

    this.logger.log('Backfill complete: matched=' + matched + ', unmatched=' + unmatched + ', alreadySet=' + alreadySet);
    return { matched, unmatched, alreadySet, errors };
  }
}
