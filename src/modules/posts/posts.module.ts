import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './entities/post.entity';
import { PostCategory } from '../post-categories/entities/post-category.entity';
import { ViewsModule } from '../views/views.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostCategory]),
    ViewsModule,
    AuditLogsModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, CloudflareService],
})
export class PostsModule {}
