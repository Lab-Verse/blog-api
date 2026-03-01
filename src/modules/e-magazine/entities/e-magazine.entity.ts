import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Category } from '../../categories/entities/category.entity';
import { Tag } from '../../tags/entities/tag.entity';

@Entity('e_magazines')
export class EMagazine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  cover_image_url: string;

  @Column()
  pdf_url: string;

  @Column()
  issue_number: number;

  @Column({ type: 'date', nullable: true })
  published_date: Date;

  @Column({ default: 'draft' })
  status: string;

  @Column({ nullable: true })
  page_count: number;

  @Column({ type: 'bigint', nullable: true })
  file_size: number;

  @Column({ type: 'uuid', nullable: true })
  category_id: string;

  @Column({ type: 'uuid' })
  uploaded_by: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by' })
  user: User;

  @ManyToOne(() => Category, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToMany(() => Tag)
  @JoinTable({
    name: 'e_magazine_tags',
    joinColumn: { name: 'e_magazine_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumnName: 'id' },
  })
  tags: Tag[];
}
