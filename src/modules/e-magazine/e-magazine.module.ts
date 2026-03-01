import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EMagazineService } from './e-magazine.service';
import { EMagazineController } from './e-magazine.controller';
import { EMagazine } from './entities/e-magazine.entity';
import { Tag } from '../tags/entities/tag.entity';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Module({
  imports: [TypeOrmModule.forFeature([EMagazine, Tag])],
  controllers: [EMagazineController],
  providers: [EMagazineService, CloudflareService],
  exports: [EMagazineService],
})
export class EMagazineModule {}
