import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async create(createAuditLogDto: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create(createAuditLogDto);
    return this.auditLogRepository.save(auditLog);
  }

  async findAll(queryDto?: QueryAuditLogsDto): Promise<{
    items: AuditLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = queryDto?.page || 1;
    const limit = queryDto?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    // Apply filters
    if (queryDto?.user_id) {
      where.user_id = queryDto.user_id;
    }
    if (queryDto?.action) {
      where.action = queryDto.action;
    }
    if (queryDto?.auditable_type) {
      where.auditable_type = queryDto.auditable_type;
    }
    if (queryDto?.auditable_id) {
      where.auditable_id = queryDto.auditable_id;
    }

    // Date range filtering
    if (queryDto?.start_date && queryDto?.end_date) {
      where.created_at = Between(
        new Date(queryDto.start_date),
        new Date(queryDto.end_date),
      );
    } else if (queryDto?.start_date) {
      where.created_at = MoreThanOrEqual(new Date(queryDto.start_date));
    } else if (queryDto?.end_date) {
      where.created_at = LessThanOrEqual(new Date(queryDto.end_date));
    }

    const [items, total] = await this.auditLogRepository.findAndCount({
      where,
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<AuditLog> {
    const auditLog = await this.auditLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!auditLog) {
      throw new NotFoundException(`Audit log with ID ${id} not found`);
    }

    return auditLog;
  }

  async findByUser(userId: string): Promise<AuditLog[]> {
    if (!userId) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.auditLogRepository.find({
      where: { user_id: userId },
      relations: ['user'],
      order: { created_at: 'DESC' },
    });
  }
}
