import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Post, PostStatus } from './entities/post.entity';
import { PostCategory } from '../post-categories/entities/post-category.entity';
import { PostMedia } from '../post-media/entities/post-media.entity';
import { Media } from '../media/entities/media.entity';
import { User } from '../users/entities/user.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { EmailService } from '../auth/email.service';

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(PostCategory)
    private postCategoryRepository: Repository<PostCategory>,
    @InjectRepository(PostMedia)
    private postMediaRepository: Repository<PostMedia>,
    @InjectRepository(Media)
    private mediaRepository: Repository<Media>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  private readonly uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private isUuid(value: string): boolean {
    return this.uuidRegex.test(value);
  }

  private isUrlLike(value: string): boolean {
    return (
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('/')
    );
  }

  private inferMimeTypeFromUrl(url: string): string {
    const cleanUrl = url.split('?')[0].toLowerCase();
    if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) return 'image/jpeg';
    if (cleanUrl.endsWith('.png')) return 'image/png';
    if (cleanUrl.endsWith('.gif')) return 'image/gif';
    if (cleanUrl.endsWith('.webp')) return 'image/webp';
    if (cleanUrl.endsWith('.svg')) return 'image/svg+xml';
    if (cleanUrl.endsWith('.mp4')) return 'video/mp4';
    if (cleanUrl.endsWith('.mov')) return 'video/quicktime';
    if (cleanUrl.endsWith('.pdf')) return 'application/pdf';
    return 'application/octet-stream';
  }

  private extractFilenameFromUrl(url: string): string {
    const cleanUrl = url.split('?')[0];
    const segments = cleanUrl.split('/').filter(Boolean);
    return segments[segments.length - 1] || `media-${Date.now()}`;
  }

  private async resolveMediaIdsForUpdate(
    rawMediaIds: string[],
    ownerUserId: string,
  ): Promise<string[]> {
    const resolved: string[] = [];

    for (const item of rawMediaIds) {
      if (this.isUuid(item)) {
        resolved.push(item);
        continue;
      }

      if (this.isUrlLike(item)) {
        const filename = this.extractFilenameFromUrl(item);
        const media = this.mediaRepository.create({
          user_id: ownerUserId,
          filename,
          file_path: item,
          file_url: item,
          mime_type: this.inferMimeTypeFromUrl(item),
          file_size: 0,
        });
        const savedMedia = await this.mediaRepository.save(media);
        resolved.push(savedMedia.id);
      }
    }

    return Array.from(new Set(resolved));
  }

  async create(createPostDto: CreatePostDto, imageUrl?: string): Promise<Post> {
    try {
      // If an image was uploaded to Cloudflare, set the featured_image URL
      if (imageUrl) {
        createPostDto.featured_image = imageUrl;
      }

      // Check if the author has can_publish permission
      let postStatus = createPostDto.status || PostStatus.DRAFT;
      if (createPostDto.user_id && postStatus === PostStatus.PUBLISHED) {
        const author = await this.userRepository.findOne({
          where: { id: createPostDto.user_id },
        });
        // If author doesn't have can_publish permission, set to PENDING for admin approval
        if (author && !author.can_publish) {
          postStatus = PostStatus.PENDING;
        }
      }

      const post = this.postRepository.create({
        ...createPostDto,
        status: postStatus,
        featured_image: createPostDto.featured_image || undefined,
        views_count: 0,
        likes_count: 0,
        comments_count: 0,
      });

      const savedPost = await this.postRepository.save(post);

      // Handle many-to-many category relationships
      if (createPostDto.category_ids && createPostDto.category_ids.length > 0) {
        for (const categoryId of createPostDto.category_ids) {
          const postCategory = this.postCategoryRepository.create({
            post_id: savedPost.id,
            category_id: categoryId,
          });
          await this.postCategoryRepository.save(postCategory);
        }
      }

      // Handle media attachments
      if (createPostDto.media_ids && createPostDto.media_ids.length > 0) {
        for (const mediaId of createPostDto.media_ids) {
          const postMedia = this.postMediaRepository.create({
            post_id: savedPost.id,
            media_id: mediaId,
          });
          await this.postMediaRepository.save(postMedia);
        }
      }

      return savedPost;
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === '23505'
      ) {
        // Postgres unique constraint violation
        const detail =
          'detail' in error && typeof error.detail === 'string'
            ? error.detail
            : 'Post with this slug already exists';
        throw new ConflictException(detail);
      }
      throw error;
    }
  }
  async findAll(filters?: {
    categoryId?: string;
    userId?: string;
    limit?: number;
    page?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    search?: string;
  }): Promise<{ data: Post[]; total: number; limit: number; page: number }> {
    const limit = filters?.limit ?? 20;
    const page = filters?.page ?? 1;
    const offset = (page - 1) * limit;

    const query = this.postRepository.createQueryBuilder('post')
      .select([
        'post.id',
        'post.title',
        'post.slug',
        'post.excerpt',
        'post.description',
        'post.featured_image',
        'post.user_id',
        'post.category_id',
        'post.status',
        'post.views_count',
        'post.likes_count',
        'post.comments_count',
        'post.published_at',
        'post.created_at',
        'post.updated_at',
        'post.post_date_gmt',
        'post.post_modified_gmt',
        'post.guid',
      ])
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.postCategories', 'postCategories')
      .leftJoinAndSelect('postCategories.category', 'category')
      .leftJoinAndSelect('post.tags', 'postTags')
      .leftJoinAndSelect('postTags.tag', 'tag');

    if (filters?.categoryId) {
      query.andWhere('category.id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.userId) {
      query.andWhere('post.user_id = :userId', { userId: filters.userId });
    }

    if (filters?.search) {
      query.andWhere(
        '(post.title ILIKE :search OR post.excerpt ILIKE :search OR post.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Sorting
    const allowedSortFields = ['created_at', 'updated_at', 'published_at', 'views_count', 'likes_count', 'comments_count', 'title'];
    const sortField = filters?.sortBy && allowedSortFields.includes(filters.sortBy)
      ? `post.${filters.sortBy}`
      : 'post.created_at';
    const sortOrder = filters?.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    query.orderBy(sortField, sortOrder);

    // Pagination
    query.skip(offset).take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, limit, page };
  }

  async findBySlug(slug: string): Promise<Post> {
    if (!slug) {
      throw new BadRequestException('Invalid post slug');
    }

    const post = await this.postRepository.findOne({
      where: { slug },
      relations: ['user', 'category', 'postCategories', 'postCategories.category', 'media', 'media.media', 'tags', 'tags.tag'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with slug: ${slug}`);
    }

    return post;
  }

  async search(query: string, limit: number = 20, page: number = 1): Promise<{ data: Post[]; total: number; limit: number; page: number }> {
    const offset = (page - 1) * limit;

    const qb = this.postRepository.createQueryBuilder('post')
      .select([
        'post.id',
        'post.title',
        'post.slug',
        'post.excerpt',
        'post.description',
        'post.featured_image',
        'post.user_id',
        'post.category_id',
        'post.status',
        'post.views_count',
        'post.likes_count',
        'post.comments_count',
        'post.published_at',
        'post.created_at',
        'post.updated_at',
      ])
      .leftJoinAndSelect('post.user', 'user')
      .leftJoinAndSelect('post.postCategories', 'postCategories')
      .leftJoinAndSelect('postCategories.category', 'category')
      .leftJoinAndSelect('post.tags', 'postTags')
      .leftJoinAndSelect('postTags.tag', 'tag');

    if (query) {
      qb.where(
        '(post.title ILIKE :q OR post.excerpt ILIKE :q OR post.description ILIKE :q OR post.content ILIKE :q)',
        { q: `%${query}%` },
      );
    }

    qb.orderBy('post.created_at', 'DESC')
      .skip(offset)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, limit, page };
  }

  async findOne(id: string): Promise<Post> {
    if (!id) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postRepository.findOne({
      where: { id },
      relations: ['user', 'category', 'postCategories', 'postCategories.category', 'media', 'media.media'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with id: ${id}`);
    }

    return post;
  }

  async incrementViews(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'views_count', 1);
  }

  async incrementLikes(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'likes_count', 1);
  }

  async decrementLikes(id: string): Promise<void> {
    await this.postRepository.decrement({ id }, 'likes_count', 1);
  }

  async incrementComments(id: string): Promise<void> {
    await this.postRepository.increment({ id }, 'comments_count', 1);
  }

  async decrementComments(id: string): Promise<void> {
    await this.postRepository.decrement({ id }, 'comments_count', 1);
  }

  async update(id: string, updatePostDto: UpdatePostDto): Promise<Post> {
    const { tag_ids, media_ids, category_ids, ...postData } = updatePostDto;

    const existingPost = await this.postRepository.findOne({ where: { id } });
    if (!existingPost) {
      throw new NotFoundException(`Post not found with id: ${id}`);
    }
    
    const result = await this.postRepository.update(id, postData);
    // Update media relationships
    if (media_ids !== undefined) {
      const normalizedMediaIds = (media_ids || [])
        .map((mediaId) => String(mediaId ?? '').trim())
        .filter(Boolean);

      const resolvedMediaIds = await this.resolveMediaIdsForUpdate(
        normalizedMediaIds,
        existingPost.user_id,
      );

      await this.postMediaRepository.delete({ post_id: id });
      if (resolvedMediaIds.length > 0) {
        for (const mediaId of resolvedMediaIds) {
          await this.postMediaRepository.save({ post_id: id, media_id: mediaId });
        }
      }
    }

    // Update category relationships
    if (category_ids !== undefined) {
      await this.postCategoryRepository.delete({ post_id: id });
      if (category_ids.length > 0) {
        for (const categoryId of category_ids) {
          await this.postCategoryRepository.save({ post_id: id, category_id: categoryId });
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.postRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Post not found with id: ${id}`);
    }
  }

  async getComments(postId: string) {
    if (!postId) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['comments'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    return post.comments;
  }

  async getMedia(postId: string) {
    if (!postId) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['media'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    return post.media;
  }

  async getTags(postId: string) {
    if (!postId) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['tags'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    return post.tags;
  }

  async getReactions(postId: string) {
    if (!postId) {
      throw new BadRequestException('Invalid post ID');
    }

    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['reactions'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    return post.reactions;
  }

  // Submit post for approval - sets status to PENDING and notifies admin
  async submitForApproval(postId: string): Promise<Post> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    await this.postRepository.update(postId, { status: PostStatus.PENDING });

    // Notify admin about new post submission
    try {
      await this.emailService.sendNewPostSubmissionNotification({
        id: post.id,
        title: post.title,
        authorName: post.user?.username || 'Unknown',
        authorEmail: post.user?.email || '',
      });
    } catch (emailError) {
      console.error('Failed to send post submission notification:', emailError);
    }

    return this.findOne(postId);
  }

  // Admin approve post - sets status to PUBLISHED
  async approvePost(postId: string): Promise<{ success: boolean; message: string }> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    if (post.status !== PostStatus.PENDING) {
      throw new BadRequestException('Post is not in pending status');
    }

    await this.postRepository.update(postId, { status: PostStatus.PUBLISHED });

    // Notify author about post approval
    if (post.user?.email) {
      try {
        await this.emailService.sendPostApprovedNotification({
          title: post.title,
          slug: post.slug,
          authorEmail: post.user.email,
          authorName: post.user.username || 'User',
        });
      } catch (emailError) {
        console.error('Failed to send post approval notification:', emailError);
      }
    }

    return {
      success: true,
      message: 'Post approved and published successfully',
    };
  }

  // Admin reject post - sets status back to DRAFT
  async rejectPost(postId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const post = await this.postRepository.findOne({
      where: { id: postId },
      relations: ['user'],
    });

    if (!post) {
      throw new NotFoundException(`Post not found with id: ${postId}`);
    }

    if (post.status !== PostStatus.PENDING) {
      throw new BadRequestException('Post is not in pending status');
    }

    await this.postRepository.update(postId, { status: PostStatus.DRAFT });

    // Notify author about post rejection
    if (post.user?.email) {
      try {
        await this.emailService.sendPostRejectedNotification({
          title: post.title,
          authorEmail: post.user.email,
          authorName: post.user.username || 'User',
          reason,
        });
      } catch (emailError) {
        console.error('Failed to send post rejection notification:', emailError);
      }
    }

    return {
      success: true,
      message: 'Post rejected successfully',
    };
  }

  // Get all pending posts for admin review
  async findPendingPosts(): Promise<Post[]> {
    return this.postRepository.find({
      where: { status: PostStatus.PENDING },
      relations: ['user', 'category', 'postCategories', 'postCategories.category'],
      order: { created_at: 'DESC' },
    });
  }

  // Get post stats for a user (dashboard)
  async getStats(userId: string) {
    const allPosts = await this.postRepository.find({
      where: { user_id: userId },
    });

    const published = allPosts.filter(p => p.status === PostStatus.PUBLISHED);
    const drafts = allPosts.filter(p => p.status === PostStatus.DRAFT);
    const archived = allPosts.filter(p => p.status === PostStatus.ARCHIVED);

    const totalViews = allPosts.reduce((sum, p) => sum + (p.views_count || 0), 0);
    const totalLikes = allPosts.reduce((sum, p) => sum + (p.likes_count || 0), 0);
    const totalComments = allPosts.reduce((sum, p) => sum + (p.comments_count || 0), 0);
    const totalPosts = allPosts.length;

    return {
      totalPosts,
      publishedPosts: published.length,
      draftPosts: drafts.length,
      archivedPosts: archived.length,
      totalViews,
      totalLikes,
      totalComments,
      avgViewsPerPost: totalPosts > 0 ? totalViews / totalPosts : 0,
      avgLikesPerPost: totalPosts > 0 ? totalLikes / totalPosts : 0,
      avgCommentsPerPost: totalPosts > 0 ? totalComments / totalPosts : 0,
    };
  }
}
