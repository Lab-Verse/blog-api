import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentRepliesService } from './comment-replies.service';
import { CommentRepliesController } from './comment-replies.controller';
import { CommentReply } from './entities/comment-reply.entity';
import { Comment } from '../comments/entities/comment.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CommentReply, Comment]),
    AuditLogsModule,
  ],
  controllers: [CommentRepliesController],
  providers: [CommentRepliesService],
})
export class CommentRepliesModule {}
