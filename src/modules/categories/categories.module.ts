import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { Category } from './entities/category.entity';
import { Post } from '../posts/entities/post.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Post]), AuditLogsModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, CloudflareService],
})
export class CategoriesModule {}
