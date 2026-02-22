import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, FindOptionsWhere, FindOptionsOrder } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserProfileDto } from './dto/create-user-profile.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { Post } from '../posts/entities/post.entity';
import { Draft } from '../drafts/entities/draft.entity';
import { Bookmark } from '../bookmarks/entities/bookmark.entity';
import { CategoryFollower } from '../category-followers/entities/category-follower.entity';
import { AuthorFollower } from '../author-followers/entities/author-follower.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Category } from '../categories/entities/category.entity';
import { Role } from '../roles/entities/role.entity';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(UserProfile)
    private userProfileRepository: Repository<UserProfile>,

    @InjectRepository(Post)
    private postRepository: Repository<Post>,

    @InjectRepository(Draft)
    private draftRepository: Repository<Draft>,

    @InjectRepository(Bookmark)
    private bookmarkRepository: Repository<Bookmark>,

    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,

    @InjectRepository(CategoryFollower)
    private categoryFollowerRepository: Repository<CategoryFollower>,

    @InjectRepository(AuthorFollower)
    private authorFollowerRepository: Repository<AuthorFollower>,

    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,

    @InjectRepository(Role)
    private roleRepository: Repository<Role>,

    private cloudflareService: CloudflareService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Hash password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Get role ID based on role name
    if (createUserDto.role) {
      const role = await this.roleRepository.findOne({
        where: { slug: createUserDto.role },
      });

      if (role) {
        createUserDto.role_id = role.id;
      }
    }

    const user = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });
    return this.userRepository.save(user);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
  ): Promise<{
    items: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    const where: FindOptionsWhere<User> = {
      role: Not('super_admin'),
    };

    if (status) {
      where.status = status as any;
    }

    const queryBuilder = this.userRepository.createQueryBuilder('user');
    queryBuilder.where('user.role != :role', { role: 'super_admin' });

    if (search) {
      queryBuilder.andWhere(
        '(user.username ILIKE :search OR user.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    queryBuilder
      .select([
        'user.id',
        'user.username',
        'user.display_name',
        'user.email',
        'user.role',
        'user.role_id',
        'user.status',
        'user.created_at',
        'user.updated_at',
      ])
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    // Return items without transformation
    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<User> {
    if (!id) {
      throw new BadRequestException('Invalid user ID');
    }
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch profile separately
    try {
      const profile = await this.userProfileRepository.findOne({
        where: { user_id: id },
      });
      (user as any).profile = profile;
    } catch (error) {
      // Profile doesn't exist, that's okay
      (user as any).profile = null;
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: [
        'id',
        'username',
        'email',
        'role',
        'role_id',
        'status',
        'created_at',
        'updated_at',
      ],
    });
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    // Hash password if provided
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.userRepository.update(id, { password: hashedPassword });
  }

  async remove(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async getProfile(userId: string) {
    if (!userId) {
      throw new BadRequestException('Invalid user ID');
    }

    const profile = await this.userProfileRepository.findOne({
      where: { user_id: userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    return profile;
  }

  async createProfile(
    createProfileDto: CreateUserProfileDto,
    filename?: string,
  ): Promise<UserProfile> {
    // Check if profile already exists
    const existingProfile = await this.userProfileRepository.findOne({
      where: { user_id: createProfileDto.user_id },
    });

    if (existingProfile) {
      throw new BadRequestException('User profile already exists');
    }

    // If a file was uploaded, set the profile_picture field
    if (filename) {
      createProfileDto.profile_picture = filename;
    }

    const profile = this.userProfileRepository.create(createProfileDto);
    return this.userProfileRepository.save(profile);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateUserProfileDto,
  ): Promise<UserProfile> {
    const profile = await this.userProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    await this.userProfileRepository.update(profile.id, updateProfileDto);
    return this.getProfile(userId);
  }

  async uploadProfilePicture(
    userId: string,
    fileBuffer: Buffer,
    originalFilename: string,
  ): Promise<UserProfile> {
    // Generate unique filename
    const timestamp = Date.now();
    const ext = originalFilename.split('.').pop();
    const filename = `profile-${userId}-${timestamp}.${ext}`;

    // Upload to R2
    const fileUrl = await this.cloudflareService.uploadFile(
      fileBuffer,
      filename,
      'profile-pictures',
    );

    const profile = await this.userProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      // Create profile if it doesn't exist
      const newProfile = await this.createProfile({
        user_id: userId,
        profile_picture: fileUrl,
      });
      return newProfile;
    }

    // Delete old profile picture from R2 if exists
    if (profile.profile_picture) {
      try {
        await this.cloudflareService.deleteFile(profile.profile_picture);
      } catch (error) {
        console.error('Failed to delete old profile picture:', error);
      }
    }

    await this.userProfileRepository.update(profile.id, {
      profile_picture: fileUrl,
    });
    return this.getProfile(userId);
  }

  async deleteProfile(userId: string): Promise<void> {
    const profile = await this.userProfileRepository.findOne({
      where: { user_id: userId },
    });

    if (!profile) {
      throw new NotFoundException('User profile not found');
    }

    // Delete profile picture from R2 if exists
    if (profile.profile_picture) {
      try {
        await this.cloudflareService.deleteFile(profile.profile_picture);
      } catch (error) {
        console.error('Failed to delete profile picture:', error);
      }
    }

    await this.userProfileRepository.delete(profile.id);
  }

  async getPosts(userId: string) {
    if (!userId) throw new BadRequestException('Invalid user ID');

    return this.postRepository.find({
      where: { user: { id: String(userId) } }, // relation to User entity
      relations: ['category', 'comments', 'reactions'],
    });
  }

  async getDrafts(userId: string) {
    if (!userId) throw new BadRequestException('Invalid user ID');

    return this.draftRepository.find({
      where: { user: { id: String(userId) } },
    });
  }

  async getBookmarks(userId: string) {
    if (!userId) throw new BadRequestException('Invalid user ID');

    return this.bookmarkRepository.find({
      where: { user: { id: String(userId) } },
      relations: ['post'],
    });
  }

  async getFollowers(userId: string) {
    if (!userId || userId.trim() === '') {
      throw new BadRequestException('Invalid user ID');
    }

    const followers = await this.authorFollowerRepository.find({
      where: { author_id: userId },
      relations: ['follower'],
      order: { created_at: 'DESC' },
    });

    return followers;
  }

  async getAllFollowing(userId: string) {
    const categoryFollows = await this.categoryFollowerRepository.find({
      where: { user_id: userId },
      relations: ['category'],
    });

    const authorFollows = await this.authorFollowerRepository.find({
      where: { follower_id: userId },
      relations: ['author'],
    });

    return {
      categories: categoryFollows.map((f) => ({
        id: f.id,
        type: 'category',
        followed: f.category,
        createdAt: f.created_at,
      })),
      authors: authorFollows.map((f) => ({
        id: f.id,
        type: 'author',
        followed: f.author,
        createdAt: f.created_at,
      })),
    };
  }

  async getNotifications(userId: string) {
    if (!userId) throw new BadRequestException('Invalid user ID');

    return this.notificationRepository.find({
      where: { userId: userId } as FindOptionsWhere<Notification>,
      order: { createdAt: 'DESC' } as FindOptionsOrder<Notification>,
    });
  }
}
