import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DraftsService } from './drafts.service';
import { DraftsController } from './drafts.controller';
import { Draft } from './entities/draft.entity';
import { DraftTranslation } from './entities/draft-translation.entity';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [TypeOrmModule.forFeature([Draft, DraftTranslation]), AuditLogsModule],
  controllers: [DraftsController],
  providers: [DraftsService],
})
export class DraftsModule {}
