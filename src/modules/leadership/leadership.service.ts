import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadershipMember } from './entities/leadership-member.entity';
import { CreateLeadershipMemberDto } from './dto/create-leadership-member.dto';
import { UpdateLeadershipMemberDto } from './dto/update-leadership-member.dto';
import { CloudflareService } from '../../common/services/cloudflare.service';

@Injectable()
export class LeadershipService {
  constructor(
    @InjectRepository(LeadershipMember)
    private leadershipRepository: Repository<LeadershipMember>,
    private cloudflareService: CloudflareService,
  ) {}

  async create(
    dto: CreateLeadershipMemberDto,
    photoFile?: Express.Multer.File,
  ): Promise<LeadershipMember> {
    let photoUrl: string | undefined;

    if (photoFile) {
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${photoFile.originalname}`;
      photoUrl = await this.cloudflareService.uploadFile(
        photoFile.buffer,
        filename,
        'leadership',
      );
    }

    // Determine display order — default to max + 1
    if (dto.display_order === undefined) {
      const maxOrder = await this.leadershipRepository
        .createQueryBuilder('m')
        .select('MAX(m.display_order)', 'max')
        .getRawOne();
      dto.display_order = (maxOrder?.max ?? -1) + 1;
    }

    const member = this.leadershipRepository.create({
      ...dto,
      photo_url: photoUrl,
    });

    return this.leadershipRepository.save(member);
  }

  async findAll(onlyActive?: boolean): Promise<LeadershipMember[]> {
    const query = this.leadershipRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.user', 'user')
      .orderBy('m.display_order', 'ASC');

    if (onlyActive !== false) {
      query.andWhere('m.is_active = :active', { active: true });
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<LeadershipMember> {
    if (!id) throw new BadRequestException('Invalid member ID');
    const member = await this.leadershipRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!member) throw new NotFoundException('Leadership member not found');
    return member;
  }

  async update(
    id: string,
    dto: UpdateLeadershipMemberDto,
    photoFile?: Express.Multer.File,
  ): Promise<LeadershipMember> {
    const member = await this.findOne(id);

    // Replace photo if new one uploaded
    if (photoFile) {
      if (member.photo_url) {
        await this.cloudflareService
          .deleteFile(member.photo_url)
          .catch(() => {});
      }
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${photoFile.originalname}`;
      member.photo_url = await this.cloudflareService.uploadFile(
        photoFile.buffer,
        filename,
        'leadership',
      );
    }

    // Update scalar fields
    if (dto.name !== undefined) member.name = dto.name;
    if (dto.designation !== undefined) member.designation = dto.designation;
    if (dto.bio !== undefined) member.bio = dto.bio;
    if (dto.email !== undefined) member.email = dto.email;
    if (dto.website_url !== undefined) member.website_url = dto.website_url;
    if (dto.twitter_url !== undefined) member.twitter_url = dto.twitter_url;
    if (dto.linkedin_url !== undefined) member.linkedin_url = dto.linkedin_url;
    if (dto.facebook_url !== undefined) member.facebook_url = dto.facebook_url;
    if (dto.instagram_url !== undefined)
      member.instagram_url = dto.instagram_url;
    if (dto.display_order !== undefined) member.display_order = dto.display_order;
    if (dto.is_active !== undefined) member.is_active = dto.is_active;
    if (dto.user_id !== undefined) member.user_id = dto.user_id;

    return this.leadershipRepository.save(member);
  }

  /**
   * Bulk-reorder members by passing an array of IDs in the desired order.
   */
  async reorder(ids: string[]): Promise<void> {
    const updates = ids.map((id, index) =>
      this.leadershipRepository.update(id, { display_order: index }),
    );
    await Promise.all(updates);
  }

  async remove(id: string): Promise<void> {
    const member = await this.findOne(id);

    if (member.photo_url) {
      await this.cloudflareService
        .deleteFile(member.photo_url)
        .catch(() => {});
    }

    const result = await this.leadershipRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Leadership member not found');
    }
  }
}
