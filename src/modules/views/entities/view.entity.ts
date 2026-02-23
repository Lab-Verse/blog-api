import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Post } from '../../posts/entities/post.entity';

@Entity('views')
export class View {
  @PrimaryGeneratedColumn()
  id: string;

  @Column({ nullable: true })
  user_id: string;

  @Column()
  viewable_type: string;

  @Column()
  viewable_id: string;

  @Column()
  ip_address: string;

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Post, { createForeignKeyConstraints: false, nullable: true })
  @JoinColumn({ name: 'viewable_id', referencedColumnName: 'id' })
  post?: Post;
}
