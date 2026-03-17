/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  QueryAgentRunsDto,
  QueryAgentArticlesDto,
} from './dto/query-agent-logs.dto';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';

@Injectable()
export class AgentLogsService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    // Create agent_config table if it doesn't exist and seed defaults
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS agent_config (
        id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        enabled BOOLEAN NOT NULL DEFAULT true,
        max_posts_per_session INTEGER NOT NULL DEFAULT 25,
        pipeline_interval_minutes INTEGER NOT NULL DEFAULT 90,
        stagger_delay_seconds INTEGER NOT NULL DEFAULT 1800,
        max_article_age_hours INTEGER NOT NULL DEFAULT 24,
        max_articles_per_category INTEGER NOT NULL DEFAULT 5,
        require_featured_image BOOLEAN NOT NULL DEFAULT true,
        image_strategy VARCHAR(50) NOT NULL DEFAULT 'source_attribution',
        image_ai_provider VARCHAR(50) NOT NULL DEFAULT 'pollinations',
        auto_publish BOOLEAN NOT NULL DEFAULT true,
        categories_enabled JSONB NOT NULL DEFAULT '[]'::jsonb,
        categories_requiring_review JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Insert default row if empty
    await this.dataSource.query(`
      INSERT INTO agent_config (id) VALUES (1)
      ON CONFLICT (id) DO NOTHING
    `);
    // Add new columns if missing (safe for existing installations)
    await this.dataSource.query(`
      ALTER TABLE agent_config
        ADD COLUMN IF NOT EXISTS categories_requiring_review JSONB NOT NULL DEFAULT '[]'::jsonb
    `).catch(() => { /* column already exists */ });
    await this.dataSource.query(`
      ALTER TABLE agent_runs
        ADD COLUMN IF NOT EXISTS cost_summary JSONB
    `).catch(() => { /* column already exists */ });
    // Publisher configuration columns
    await this.dataSource.query(`
      ALTER TABLE agent_config
        ADD COLUMN IF NOT EXISTS publisher_admin_id UUID DEFAULT NULL
    `).catch(() => { /* column already exists */ });
    await this.dataSource.query(`
      ALTER TABLE agent_config
        ADD COLUMN IF NOT EXISTS allowed_categories JSONB NOT NULL DEFAULT '[]'::jsonb
    `).catch(() => { /* column already exists */ });
  }

  async getConfig() {
    const rows = await this.dataSource.query(
      'SELECT * FROM agent_config WHERE id = 1',
    );
    return rows[0] || null;
  }

  async updateConfig(dto: UpdateAgentConfigDto) {
    const setClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    const fields: Array<[keyof UpdateAgentConfigDto, string]> = [
      ['enabled', 'enabled'],
      ['max_posts_per_session', 'max_posts_per_session'],
      ['pipeline_interval_minutes', 'pipeline_interval_minutes'],
      ['stagger_delay_seconds', 'stagger_delay_seconds'],
      ['max_article_age_hours', 'max_article_age_hours'],
      ['max_articles_per_category', 'max_articles_per_category'],
      ['require_featured_image', 'require_featured_image'],
      ['image_strategy', 'image_strategy'],
      ['image_ai_provider', 'image_ai_provider'],
      ['auto_publish', 'auto_publish'],
      ['categories_enabled', 'categories_enabled'],
      ['categories_requiring_review', 'categories_requiring_review'],
      ['publisher_admin_id', 'publisher_admin_id'],
      ['allowed_categories', 'allowed_categories'],
    ];

    const jsonFields: Set<string> = new Set([
      'categories_enabled',
      'categories_requiring_review',
      'allowed_categories',
    ]);

    for (const [dtoKey, colName] of fields) {
      if (dto[dtoKey] !== undefined) {
        setClauses.push(`${colName} = $${idx++}`);
        const value = dto[dtoKey];
        // publisher_admin_id can be null to clear it
        if (dtoKey === 'publisher_admin_id' && (value === null || value === '')) {
          params.push(null);
        } else if (jsonFields.has(dtoKey)) {
          params.push(JSON.stringify(value));
        } else {
          params.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      return this.getConfig();
    }

    setClauses.push(`updated_at = NOW()`);

    const query = `UPDATE agent_config SET ${setClauses.join(', ')} WHERE id = 1 RETURNING *`;
    const rows = await this.dataSource.query(query, params);
    return rows[0];
  }

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

  // ── Publisher Validation ────────────────────────────────

  async validatePublisher(userId: string) {
    if (!userId) {
      return { valid: false, error: 'No user ID provided' };
    }

    const users = await this.dataSource.query(
      `SELECT id, username, email, display_name, role, can_publish FROM users WHERE id = $1`,
      [userId],
    );

    if (!users.length) {
      return { valid: false, error: 'User not found' };
    }

    const user = users[0];
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin) {
      return { valid: false, error: `User '${user.username}' does not have admin role (current: ${user.role})` };
    }

    if (!user.can_publish) {
      return { valid: false, error: `User '${user.username}' does not have publish permission` };
    }

    return {
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
      },
    };
  }

  // ── HITL Review Queue ──────────────────────────────────

  async getReviewQueue(queryDto?: QueryAgentArticlesDto) {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const offset = (page - 1) * limit;

    // Review queue: articles that are rewritten but not yet published (draft posts)
    // These have blog_post_id set AND status = 'published' in aggregated_articles
    // but are actually draft posts in the posts table
    const conditions: string[] = [
      `aa.status = 'rewritten' OR (aa.blog_post_id IS NOT NULL AND p.status = 'draft')`,
    ];
    const params: any[] = [];
    let paramIndex = 1;

    if (queryDto?.category_slug) {
      conditions.push(`aa.category_slug = $${paramIndex++}`);
      params.push(queryDto.category_slug);
    }

    const whereClause = `WHERE (${conditions[0]})${conditions.length > 1 ? ' AND ' + conditions.slice(1).join(' AND ') : ''}`;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM aggregated_articles aa
      LEFT JOIN posts p ON aa.blog_post_id = p.id::uuid
      ${whereClause}
    `;
    const countResult = await this.dataSource.query(countQuery, params);
    const total = parseInt(countResult[0]?.total || '0', 10);

    const dataQuery = `
      SELECT aa.id, aa.source_url, aa.source_title, aa.source_name,
             aa.category_slug, aa.status as article_status,
             aa.blog_post_id, aa.rewritten_content, aa.seo_metadata,
             aa.source_image_url, aa.generated_image_url,
             aa.created_at, aa.updated_at,
             p.title as post_title, p.status as post_status, p.slug as post_slug
      FROM aggregated_articles aa
      LEFT JOIN posts p ON aa.blog_post_id = p.id::uuid
      ${whereClause}
      ORDER BY aa.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    const items = await this.dataSource.query(dataQuery, [
      ...params,
      limit,
      offset,
    ]);

    return { items, total, page, limit };
  }

  async approveArticle(articleId: string) {
    // Find the article and its linked blog post
    const articles = await this.dataSource.query(
      'SELECT id, blog_post_id FROM aggregated_articles WHERE id = $1',
      [articleId],
    );

    if (!articles.length) {
      return { success: false, error: 'Article not found' };
    }

    const article = articles[0];

    if (article.blog_post_id) {
      // Approve the linked blog post (set status to published)
      await this.dataSource.query(
        `UPDATE posts SET status = 'published', updated_at = NOW() WHERE id = $1`,
        [article.blog_post_id],
      );
    }

    // Update article status
    await this.dataSource.query(
      `UPDATE aggregated_articles SET status = 'published', published_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [articleId],
    );

    return { success: true, articleId, blog_post_id: article.blog_post_id };
  }

  async rejectArticle(articleId: string, reason?: string) {
    const articles = await this.dataSource.query(
      'SELECT id, blog_post_id FROM aggregated_articles WHERE id = $1',
      [articleId],
    );

    if (!articles.length) {
      return { success: false, error: 'Article not found' };
    }

    const article = articles[0];

    if (article.blog_post_id) {
      // Archive the linked blog post
      await this.dataSource.query(
        `UPDATE posts SET status = 'archived', updated_at = NOW() WHERE id = $1`,
        [article.blog_post_id],
      );
    }

    // Mark article as failed with rejection reason
    await this.dataSource.query(
      `UPDATE aggregated_articles SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1`,
      [articleId, reason || 'Rejected by reviewer'],
    );

    return { success: true, articleId, blog_post_id: article.blog_post_id };
  }

  // ── Cost telemetry ──────────────────────────────────────

  async getCostSummary(days: number = 7) {
    const validDays = Math.min(Math.max(days, 1), 90);

    const result = await this.dataSource.query(
      `
      SELECT
        COUNT(*) as total_runs,
        COALESCE(SUM((cost_summary->>'prompt_tokens')::int), 0) as total_prompt_tokens,
        COALESCE(SUM((cost_summary->>'completion_tokens')::int), 0) as total_completion_tokens,
        COALESCE(SUM((cost_summary->>'total_tokens')::int), 0) as total_tokens,
        COALESCE(SUM((cost_summary->>'api_calls')::int), 0) as total_api_calls,
        COALESCE(SUM((cost_summary->>'image_generations')::int), 0) as total_image_generations,
        COALESCE(SUM((cost_summary->>'estimated_cost_usd')::decimal), 0) as total_cost_usd
      FROM agent_runs
      WHERE cost_summary IS NOT NULL
        AND started_at >= NOW() - ($1 || ' days')::interval
      `,
      [validDays],
    );

    // Daily breakdown
    const daily = await this.dataSource.query(
      `
      SELECT
        DATE(started_at) as date,
        COUNT(*) as runs,
        COALESCE(SUM((cost_summary->>'estimated_cost_usd')::decimal), 0) as cost_usd,
        COALESCE(SUM((cost_summary->>'total_tokens')::int), 0) as tokens
      FROM agent_runs
      WHERE cost_summary IS NOT NULL
        AND started_at >= NOW() - ($1 || ' days')::interval
      GROUP BY DATE(started_at)
      ORDER BY date ASC
      `,
      [validDays],
    );

    return {
      period_days: validDays,
      totals: result[0] || {},
      daily,
    };
  }

  // ── Social media posts ─────────────────────────────────

  async getSocialPosts(query: {
    page: number;
    limit: number;
    platform?: string;
    status?: string;
  }) {
    const { page, limit, platform, status } = query;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (platform) {
      conditions.push(`sp.platform = $${paramIndex++}`);
      params.push(platform);
    }
    if (status) {
      conditions.push(`sp.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await this.dataSource.query(
      `SELECT COUNT(*) as total FROM social_media_posts sp ${whereClause}`,
      params,
    );
    const total = parseInt(countResult[0]?.total || '0', 10);

    const items = await this.dataSource.query(
      `
      SELECT sp.id, sp.article_id, sp.blog_post_id, sp.platform, sp.status,
             sp.post_text, sp.post_url, sp.platform_post_id, sp.error_message,
             sp.created_at, sp.posted_at,
             aa.source_title
      FROM social_media_posts sp
      LEFT JOIN aggregated_articles aa ON sp.article_id = aa.id
      ${whereClause}
      ORDER BY sp.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `,
      [...params, limit, offset],
    );

    return { items, total, page, limit };
  }

  async getSocialStats() {
    const byPlatform = await this.dataSource.query(`
      SELECT platform, status, COUNT(*) as count
      FROM social_media_posts
      GROUP BY platform, status
      ORDER BY platform, count DESC
    `);

    const recent = await this.dataSource.query(`
      SELECT sp.id, sp.platform, sp.status, sp.post_text, sp.posted_at,
             aa.source_title
      FROM social_media_posts sp
      LEFT JOIN aggregated_articles aa ON sp.article_id = aa.id
      ORDER BY sp.created_at DESC
      LIMIT 10
    `);

    return { byPlatform, recent };
  }
}
