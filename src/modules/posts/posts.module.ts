import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { Post } from './entities/post.entity';
import { PostCategory } from '../post-categories/entities/post-category.entity';
import { PostMedia } from '../post-media/entities/post-media.entity';
import { Media } from '../media/entities/media.entity';
import { ViewsModule } from '../views/views.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CloudflareService } from '../../common/services/cloudflare.service';
import { AuthModule } from '../auth/auth.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, PostCategory, PostMedia, Media]),
    ViewsModule,
    AuditLogsModule,
    forwardRef(() => AuthModule),
    RolesModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, CloudflareService],
})
export class PostsModule {}
