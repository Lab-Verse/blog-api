import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Post } from '../posts/entities/post.entity';
import { View } from '../views/entities/view.entity';
import { AuditLog } from '../audit-logs/entities/audit-log.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
    @InjectRepository(View)
    private viewRepository: Repository<View>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async getDashboardStats() {
    // Get total counts
    const totalUsers = await this.userRepository.count();
    const totalPosts = await this.postRepository.count();
    const totalViews = await this.viewRepository.count();

    // Get active users (users who logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeUsers = await this.auditLogRepository
      .createQueryBuilder('audit_log')
      .select('COUNT(DISTINCT audit_log.user_id)', 'count')
      .where('audit_log.action = :action', { action: 'login' })
      .andWhere('audit_log.created_at >= :date', { date: thirtyDaysAgo })
      .getRawOne();

    // Get growth percentages (compare with previous period)
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const previousPeriodUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.created_at BETWEEN :start AND :end', {
        start: sixtyDaysAgo,
        end: thirtyDaysAgo,
      })
      .getCount();

    const currentPeriodUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.created_at >= :date', { date: thirtyDaysAgo })
      .getCount();

    const userGrowth = previousPeriodUsers > 0
      ? ((currentPeriodUsers - previousPeriodUsers) / previousPeriodUsers) * 100
      : 0;

    const previousPeriodPosts = await this.postRepository
      .createQueryBuilder('post')
      .where('post.created_at BETWEEN :start AND :end', {
        start: sixtyDaysAgo,
        end: thirtyDaysAgo,
      })
      .getCount();

    const currentPeriodPosts = await this.postRepository
      .createQueryBuilder('post')
      .where('post.created_at >= :date', { date: thirtyDaysAgo })
      .getCount();

    const postGrowth = previousPeriodPosts > 0
      ? ((currentPeriodPosts - previousPeriodPosts) / previousPeriodPosts) * 100
      : 0;

    const previousPeriodViews = await this.viewRepository
      .createQueryBuilder('view')
      .where('view.created_at BETWEEN :start AND :end', {
        start: sixtyDaysAgo,
        end: thirtyDaysAgo,
      })
      .getCount();

    const currentPeriodViews = await this.viewRepository
      .createQueryBuilder('view')
      .where('view.created_at >= :date', { date: thirtyDaysAgo })
      .getCount();

    const viewGrowth = previousPeriodViews > 0
      ? ((currentPeriodViews - previousPeriodViews) / previousPeriodViews) * 100
      : 0;

    return {
      overview: {
        totalUsers,
        activeUsers: parseInt(activeUsers?.count || '0'),
        totalPosts,
        totalViews,
        growth: {
          users: Math.round(userGrowth * 10) / 10,
          posts: Math.round(postGrowth * 10) / 10,
          views: Math.round(viewGrowth * 10) / 10,
        },
      },
    };
  }

  async getTrafficData(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyViews = await this.viewRepository
      .createQueryBuilder('view')
      .select('DATE(view.created_at)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('view.created_at >= :startDate', { startDate })
      .groupBy('DATE(view.created_at)')
      .orderBy('DATE(view.created_at)', 'ASC')
      .getRawMany();

    // Fill in missing dates with 0
    const result = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      const found = dailyViews.find((d) => d.date === dateStr);
      result.push(found ? parseInt(found.count) : 0);
    }

    return result;
  }

  async getRecentAuditLogs(limit: number = 10) {
    return this.auditLogRepository.find({
      relations: ['user'],
      order: { created_at: 'DESC' },
      take: limit,
    });
  }
}
