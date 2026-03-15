/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  QueryAgentRunsDto,
  QueryAgentArticlesDto,
} from './dto/query-agent-logs.dto';

@Injectable()
export class AgentLogsService {
  constructor(private readonly dataSource: DataSource) {}

  async findAllRuns(queryDto?: QueryAgentRunsDto) {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (queryDto?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(queryDto.status);
    }
    if (queryDto?.trigger) {
      conditions.push(`trigger = $${paramIndex++}`);
      params.push(queryDto.trigger);
    }
    if (queryDto?.start_date) {
      conditions.push(`started_at >= $${paramIndex++}`);
      params.push(new Date(queryDto.start_date));
    }
    if (queryDto?.end_date) {
      conditions.push(`started_at <= $${paramIndex++}`);
      params.push(new Date(queryDto.end_date));
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM agent_runs ${whereClause}`;
    const countResult = await this.dataSource.query(countQuery, params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    const dataQuery = `
      SELECT id, started_at, finished_at, status, trigger,
             articles_fetched, articles_rewritten, articles_published,
             articles_failed, images_generated, categories_processed,
             error_log, duration_seconds
      FROM agent_runs
      ${whereClause}
      ORDER BY started_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const items = await this.dataSource.query(dataQuery, [
      ...params,
      limit,
      offset,
    ]);

    return { items, total, page, limit };
  }

  async findOneRun(id: string) {
    const result = await this.dataSource.query(
      'SELECT * FROM agent_runs WHERE id = $1',
      [id],
    );
    return result[0] || null;
  }

  async findAllArticles(queryDto?: QueryAgentArticlesDto) {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (queryDto?.status) {
      conditions.push(`status = $${paramIndex++}`);
      params.push(queryDto.status);
    }
    if (queryDto?.category_slug) {
      conditions.push(`category_slug = $${paramIndex++}`);
      params.push(queryDto.category_slug);
    }
    if (queryDto?.start_date) {
      conditions.push(`created_at >= $${paramIndex++}`);
      params.push(new Date(queryDto.start_date));
    }
    if (queryDto?.end_date) {
      conditions.push(`created_at <= $${paramIndex++}`);
      params.push(new Date(queryDto.end_date));
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*) as total FROM aggregated_articles ${whereClause}`;
    const countResult = await this.dataSource.query(countQuery, params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    const dataQuery = `
      SELECT id, source_url, source_title, source_name, category_slug,
             status, blog_post_id, source_image_url, generated_image_url,
             error_message, retry_count, created_at, updated_at, published_at
      FROM aggregated_articles
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const items = await this.dataSource.query(dataQuery, [
      ...params,
      limit,
      offset,
    ]);

    return { items, total, page, limit };
  }

  async getStats() {
    // Overall counts for agent runs
    const runStats = await this.dataSource.query(`
      SELECT
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_runs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
        COUNT(*) FILTER (WHERE status = 'running') as running_runs,
        COALESCE(SUM(articles_fetched), 0) as total_fetched,
        COALESCE(SUM(articles_rewritten), 0) as total_rewritten,
        COALESCE(SUM(articles_published), 0) as total_published,
        COALESCE(SUM(articles_failed), 0) as total_failed,
        COALESCE(SUM(images_generated), 0) as total_images,
        COALESCE(AVG(duration_seconds) FILTER (WHERE status = 'completed'), 0) as avg_duration,
        MAX(started_at) as last_run_at
      FROM agent_runs
    `);

    // Article status breakdown
    const articleStats = await this.dataSource.query(`
      SELECT status, COUNT(*) as count
      FROM aggregated_articles
      GROUP BY status
      ORDER BY count DESC
    `);

    // Articles by category
    const categoryStats = await this.dataSource.query(`
      SELECT category_slug, status, COUNT(*) as count
      FROM aggregated_articles
      GROUP BY category_slug, status
      ORDER BY category_slug, count DESC
    `);

    // Last 7 days daily published count
    const dailyPublished = await this.dataSource.query(`
      SELECT DATE(published_at) as date, COUNT(*) as count
      FROM aggregated_articles
      WHERE published_at IS NOT NULL
        AND published_at >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(published_at)
      ORDER BY date ASC
    `);

    // Recent runs (last 5)
    const recentRuns = await this.dataSource.query(`
      SELECT id, started_at, finished_at, status, trigger,
             articles_fetched, articles_published, articles_failed,
             images_generated, duration_seconds
      FROM agent_runs
      ORDER BY started_at DESC
      LIMIT 5
    `);

    return {
      runs: runStats[0] || {},
      articlesByStatus: articleStats,
      articlesByCategory: categoryStats,
      dailyPublished,
      recentRuns,
    };
  }
}
