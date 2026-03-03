import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Report } from '../../reports/entities/report.entity';
import { UserProfile } from './user-profile.entity';
export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  username: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  display_name?: string;

  @Column({ unique: true, nullable: true })
  login?: string;

  @Column({ default: 'user' })
  role: string;

  @Column('uuid', { nullable: true })
  role_id?: string;

  @Column({ type: 'enum', enum: UserStatus, nullable: true })
  status: UserStatus;

  @Column({ default: false })
  can_publish: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
  @OneToMany(() => Report, (report) => report.user)
  reports: Report[];

  @OneToOne(() => UserProfile, (profile) => profile.user, { eager: false })
  profile: UserProfile;
}
