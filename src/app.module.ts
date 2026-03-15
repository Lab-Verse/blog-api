import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { dataSourceOptions } from './config/database.config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PostsModule } from './modules/posts/posts.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CommentsModule } from './modules/comments/comments.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { AnswersModule } from './modules/answers/answers.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { ReactionsModule } from './modules/reactions/reactions.module';
import { TagsModule } from './modules/tags/tags.module';
import { MediaModule } from './modules/media/media.module';
import { DraftsModule } from './modules/drafts/drafts.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { ViewsModule } from './modules/views/views.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthorFollowersModule } from './modules/author-followers/author-followers.module';
import { CategoryFollowersModule } from './modules/category-followers/category-followers.module';
import { CommentRepliesModule } from './modules/comment-replies/comment-replies.module';
import { PostMediaModule } from './modules/post-media/post-media.module';
import { PostTagsModule } from './modules/post-tags/post-tags.module';
import { RolePermissionsModule } from './modules/role-permissions/role-permissions.module';
import { ImportModule } from './modules/import/import.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { EMagazineModule } from './modules/e-magazine/e-magazine.module';
import { LeadershipModule } from './modules/leadership/leadership.module';
import { AgentLogsModule } from './modules/agent-logs/agent-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 5,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 30,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    UsersModule,
    PostsModule,
    CategoriesModule,
    CommentsModule,
    QuestionsModule,
    AnswersModule,
    BookmarksModule,
    ReactionsModule,
    TagsModule,
    MediaModule,
    DraftsModule,
    NotificationsModule,
    RolesModule,
    PermissionsModule,
    ReportsModule,
    ViewsModule,
    AuditLogsModule,
    AuthorFollowersModule,
    CategoryFollowersModule,
    CommentRepliesModule,
    PostMediaModule,
    PostTagsModule,
    RolePermissionsModule,
    ImportModule,
    DashboardModule,
    EMagazineModule,
    LeadershipModule,
    AgentLogsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
