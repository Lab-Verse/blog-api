import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('leadership_members')
export class LeadershipMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  designation: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  photo_url: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  website_url: string;

  @Column({ nullable: true })
  twitter_url: string;

  @Column({ nullable: true })
  linkedin_url: string;

  @Column({ nullable: true })
  facebook_url: string;

  @Column({ nullable: true })
  instagram_url: string;

  @Column({ default: 0 })
  display_order: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ type: 'uuid', nullable: true })
  user_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Optional link to an existing blog user
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
