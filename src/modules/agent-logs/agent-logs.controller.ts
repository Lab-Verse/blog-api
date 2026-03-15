import {
  Controller,
  Get,
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
}
