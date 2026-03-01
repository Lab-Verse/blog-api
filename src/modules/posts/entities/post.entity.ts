import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { PostMedia } from 'src/modules/post-media/entities/post-media.entity';
import { PostTag } from 'src/modules/post-tags/entities/post-tag.entity';
import { Reaction } from 'src/modules/reactions/entities/reaction.entity';
import { Comment } from 'src/modules/comments/entities/comment.entity';
import { PostCategory } from '../../post-categories/entities/post-category.entity';
import { PostTranslation } from './post-translation.entity';

export enum PostStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('posts')
export class Post {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column('text')
  content: string;

  @Column('text', { nullable: true })
  excerpt?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ nullable: true })
  guid?: string;

  @Column()
  user_id: string;

  @Column({ nullable: true })
  category_id: string;

  @Column({ type: 'enum', enum: PostStatus, nullable: true })
  status: PostStatus;

  @Column({ nullable: true })
  featured_image?: string;

  @Column({ default: 0 })
  views_count: number;

  @Column({ default: 0 })
  likes_count: number;

  @Column({ default: 0 })
  comments_count: number;

  @Column({ nullable: true })
  published_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  post_date_gmt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  post_modified_gmt?: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Category, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany(() => Comment, (comment) => comment.post, { cascade: true })
  comments: Comment[];

  @OneToMany(() => PostMedia, (media) => media.post, { cascade: true })
  media: PostMedia[];

  @OneToMany(() => PostTag, (tag) => tag.post, { cascade: true })
  tags: PostTag[];

  @OneToMany(() => Reaction, (reaction) => reaction.post, { cascade: true })
  reactions: Reaction[];

  @OneToMany(() => PostCategory, (postCategory) => postCategory.post, { cascade: true })
  postCategories: PostCategory[];

  @OneToMany(() => PostTranslation, (translation) => translation.post, { cascade: true })
  translations: PostTranslation[];

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];
}
