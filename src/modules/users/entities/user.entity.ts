import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Report } from '../../reports/entities/report.entity';
export enum UserStatus {
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
  @OneToMany(() => Report, (report) => report.user)
  reports: Report[];
}
