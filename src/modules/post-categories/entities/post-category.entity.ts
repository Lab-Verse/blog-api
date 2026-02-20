import {
  Entity,
  PrimaryColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Post } from '../../posts/entities/post.entity';
import { Category } from '../../categories/entities/category.entity';

@Entity('post_categories')
export class PostCategory {
  @PrimaryColumn('uuid')
  post_id: string;

  @PrimaryColumn('uuid')
  category_id: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => Post, (post) => post.postCategories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: Post;

  @ManyToOne(() => Category, (category) => category.postCategories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_id' })
  category: Category;
}
