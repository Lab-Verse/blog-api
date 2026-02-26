import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { ImportMediaService } from './import-media.service';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Post } from '../posts/entities/post.entity';
import { PostCategory } from '../post-categories/entities/post-category.entity';
import { Tag } from '../tags/entities/tag.entity';
import { PostTag } from '../post-tags/entities/post-tag.entity';
import { Media } from '../media/entities/media.entity';
import { PostMedia } from '../post-media/entities/post-media.entity';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      Post,
      PostCategory,
      Tag,
      PostTag,
      Media,
      PostMedia,
    ]),
  ],
  controllers: [ImportController],
  providers: [ImportService, ImportMediaService, CloudflareService],
  exports: [ImportService, ImportMediaService],
})
export class ImportModule {}
