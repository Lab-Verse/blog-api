import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tag } from './tag.entity';

@Entity('tag_translations')
@Unique(['tag_id', 'locale'])
@Unique(['slug', 'locale'])
export class TagTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tag_id: string;

  @Column({ length: 5 })
  locale: string;

  @Column()
  name: string;

  @Column()
  slug: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Tag, (tag) => tag.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tag_id' })
  tag: Tag;
}
