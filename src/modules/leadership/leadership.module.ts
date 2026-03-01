import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadershipService } from './leadership.service';
import { LeadershipController } from './leadership.controller';
import { LeadershipMember } from './entities/leadership-member.entity';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Module({
  imports: [TypeOrmModule.forFeature([LeadershipMember])],
  controllers: [LeadershipController],
  providers: [LeadershipService, CloudflareService],
  exports: [LeadershipService],
})
export class LeadershipModule {}
