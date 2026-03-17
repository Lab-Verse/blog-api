import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AgentLogsService } from './agent-logs.service';
import { QueryAgentRunsDto, QueryAgentArticlesDto } from './dto/query-agent-logs.dto';
import { UpdateAgentConfigDto } from './dto/update-agent-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('agent-logs')
@UseGuards(JwtAuthGuard)
export class AgentLogsController {
  constructor(private readonly agentLogsService: AgentLogsService) {}

  @Get('config')
  async getConfig() {
    return this.agentLogsService.getConfig();
  }

  @Patch('config')
  async updateConfig(@Body() dto: UpdateAgentConfigDto) {
    return this.agentLogsService.updateConfig(dto);
  }

  @Get('stats')
  async getStats() {
    return this.agentLogsService.getStats();
  }

  @Get('runs')
  async findAllRuns(@Query() queryDto: QueryAgentRunsDto) {
    return this.agentLogsService.findAllRuns(queryDto);
  }

  @Get('runs/:id')
  async findOneRun(@Param('id') id: string) {
    return this.agentLogsService.findOneRun(id);
  }

  @Get('articles')
  async findAllArticles(@Query() queryDto: QueryAgentArticlesDto) {
    return this.agentLogsService.findAllArticles(queryDto);
  }

  // ── HITL Review Queue ──────────────────────────────────

  @Get('review-queue')
  async getReviewQueue(@Query() queryDto: QueryAgentArticlesDto) {
    return this.agentLogsService.getReviewQueue(queryDto);
  }

  @Post('articles/:id/approve')
  async approveArticle(@Param('id') id: string) {
    return this.agentLogsService.approveArticle(id);
  }

  @Post('articles/:id/reject')
  async rejectArticle(
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.agentLogsService.rejectArticle(id, reason);
  }

  // ── Cost telemetry ──────────────────────────────────────

  @Get('cost-summary')
  async getCostSummary(
    @Query('days') days?: string,
  ) {
    return this.agentLogsService.getCostSummary(parseInt(days || '7', 10));
  }

  // ── Social media posts ─────────────────────────────────

  @Get('social-posts')
  async getSocialPosts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('platform') platform?: string,
    @Query('status') status?: string,
  ) {
    return this.agentLogsService.getSocialPosts({
      page: parseInt(page || '1', 10),
      limit: parseInt(limit || '20', 10),
      platform,
      status,
    });
  }

  @Get('social-stats')
  async getSocialStats() {
    return this.agentLogsService.getSocialStats();
  }

  // ── Publisher validation ────────────────────────────────

  @Get('validate-publisher/:userId')
  async validatePublisher(@Param('userId') userId: string) {
    return this.agentLogsService.validatePublisher(userId);
  }
}
