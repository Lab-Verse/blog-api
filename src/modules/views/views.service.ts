import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { View } from './entities/view.entity';
import { CreateViewDto } from './dto/create-view.dto';
import { Post } from '../posts/entities/post.entity';

@Injectable()
export class ViewsService {
  constructor(
    @InjectRepository(View)
    private viewRepository: Repository<View>,
    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async create(createViewDto: CreateViewDto): Promise<View> {
    if (!createViewDto.user_id) {
      throw new BadRequestException('user_id is required to track a view');
    }
    const view = this.viewRepository.create(createViewDto);
    const savedView = await this.viewRepository.save(view);

    if (createViewDto.viewable_type === 'post') {
      await this.postRepository.increment(
        { id: createViewDto.viewable_id },
        'views_count',
        1,
      );
    }

    return savedView;
  }

  async findByUser(userId: string): Promise<View[]> {
    if (!userId) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.viewRepository.find({
      where: { user_id: userId },
      relations: ['user', 'post'],
    });
  }

  async findByPost(postId: string): Promise<View[]> {
    if (!postId) {
      throw new BadRequestException('Invalid post ID');
    }
    return this.viewRepository.find({
      where: { viewable_id: postId, viewable_type: 'post' },
      relations: ['user', 'post'],
    });
  }

  async getStats(viewableType?: string, viewableId?: string) {
    const where: Record<string, any> = {};
    if (viewableType) where.viewable_type = viewableType;
    if (viewableId) where.viewable_id = viewableId;

    const views = await this.viewRepository.find({ where });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const total = views.length;
    const authenticated = views.filter((view) => Boolean(view.user_id)).length;
    const anonymous = total - authenticated;

    const uniqueUsers = new Set(
      views.filter((view) => view.user_id).map((view) => view.user_id),
    ).size;
    const uniqueIPs = new Set(views.map((view) => view.ip_address)).size;

    const today = views.filter((view) => {
      const date = new Date(view.created_at);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }).length;

    const thisWeek = views.filter(
      (view) => new Date(view.created_at) >= weekAgo,
    ).length;

    const thisMonth = views.filter(
      (view) => new Date(view.created_at) >= monthStart,
    ).length;

    const byType = views.reduce(
      (acc, view) => {
        acc[view.viewable_type] = (acc[view.viewable_type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total,
      authenticated,
      anonymous,
      uniqueUsers,
      uniqueIPs,
      today,
      thisWeek,
      thisMonth,
      byType,
    };
  }

  async getAnalytics(
    viewableType?: string,
    viewableId?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 10,
  ) {
    const where: Record<string, any> = {};
    if (viewableType) where.viewable_type = viewableType;
    if (viewableId) where.viewable_id = viewableId;

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      where.created_at = Between(start, end);
    }

    const views = await this.viewRepository.find({
      where,
      relations: ['user', 'post'],
      order: { created_at: 'DESC' },
    });

    const totalViews = views.length;
    const uniqueVisitors = new Set(
      views.map((view) => view.user_id || view.ip_address),
    ).size;

    const viewsByDay = views.reduce(
      (acc, view) => {
        const day = new Date(view.created_at).toISOString().slice(0, 10);
        acc[day] = (acc[day] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const viewsByHour = views.reduce(
      (acc, view) => {
        const hour = new Date(view.created_at).getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    const dayEntries = Object.entries(viewsByDay);
    const peak = dayEntries.reduce(
      (best, current) => (current[1] > best[1] ? current : best),
      ['', 0] as [string, number],
    );

    const averageViewsPerDay =
      dayEntries.length > 0 ? totalViews / dayEntries.length : 0;

    const topViewerCount = new Map<string, number>();
    views.forEach((view) => {
      if (!view.user) return;
      topViewerCount.set(view.user.id, (topViewerCount.get(view.user.id) || 0) + 1);
    });

    const topViewers = Array.from(topViewerCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId]) => views.find((view) => view.user?.id === userId)?.user)
      .filter(Boolean);

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 10;
    const totalRecentViews = views.length;
    const totalRecentPages = Math.max(1, Math.ceil(totalRecentViews / safeLimit));
    const offset = (safePage - 1) * safeLimit;
    const pagedRecentViews = views.slice(offset, offset + safeLimit);

    return {
      totalViews,
      uniqueVisitors,
      averageViewsPerDay,
      peakViewDate: peak[0] || '',
      peakViewCount: peak[1] || 0,
      viewsByHour,
      viewsByDay,
      topViewers,
      recentViews: pagedRecentViews,
      recentViewsTotal: totalRecentViews,
      recentViewsPage: safePage,
      recentViewsLimit: safeLimit,
      recentViewsPages: totalRecentPages,
    };
  }
}
