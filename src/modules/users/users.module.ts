import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { UserProfile } from './entities/user-profile.entity';
import { Post } from '../posts/entities/post.entity';
import { Draft } from '../drafts/entities/draft.entity';
import { Bookmark } from '../bookmarks/entities/bookmark.entity';
import { CategoryFollower } from '../category-followers/entities/category-follower.entity';
import { AuthorFollower } from '../author-followers/entities/author-follower.entity';
import { Notification } from '../notifications/entities/notification.entity';
import { Category } from '../categories/entities/category.entity';
import { Role } from '../roles/entities/role.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserProfile,
      Post,
      Draft,
      Bookmark,
      CategoryFollower,
      AuthorFollower,
      Notification,
      Category,
      Role,
    ]),
    AuditLogsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, CloudflareService],
  exports: [UsersService],
})
export class UsersModule {}
