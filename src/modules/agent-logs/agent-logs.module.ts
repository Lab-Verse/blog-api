import { Module } from '@nestjs/common';
import { AgentLogsService } from './agent-logs.service';
import { AgentLogsController } from './agent-logs.controller';

@Module({
  controllers: [AgentLogsController],
  providers: [AgentLogsService],
  exports: [AgentLogsService],
})
export class AgentLogsModule {}
