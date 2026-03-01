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
import { Draft } from './draft.entity';

@Entity('draft_translations')
@Unique(['draft_id', 'locale'])
export class DraftTranslation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  draft_id: string;

  @Column({ length: 5 })
  locale: string;

  @Column({ nullable: true })
  title?: string;

  @Column('text', { nullable: true })
  content?: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => Draft, (draft) => draft.translations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'draft_id' })
  draft: Draft;
}
