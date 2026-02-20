import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Post } from '../posts/entities/post.entity';
import { PostCategory } from '../post-categories/entities/post-category.entity';
import { Tag } from '../tags/entities/tag.entity';
import { PostTag } from '../post-tags/entities/post-tag.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Category,
      Post,
      PostCategory,
      Tag,
      PostTag,
    ]),
  ],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
