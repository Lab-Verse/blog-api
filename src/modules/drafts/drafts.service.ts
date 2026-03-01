import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Draft } from './entities/draft.entity';
import { DraftTranslation } from './entities/draft-translation.entity';
import { CreateDraftDto } from './dto/create-draft.dto';
import { UpdateDraftDto } from './dto/update-draft.dto';
import { CreateDraftTranslationDto, UpdateDraftTranslationDto } from './dto/draft-translation.dto';

@Injectable()
export class DraftsService {
  constructor(
    @InjectRepository(Draft)
    private draftRepository: Repository<Draft>,
    @InjectRepository(DraftTranslation)
    private draftTranslationRepository: Repository<DraftTranslation>,
  ) {}

  async create(createDraftDto: CreateDraftDto): Promise<Draft> {
    const draft = this.draftRepository.create(createDraftDto);
    return this.draftRepository.save(draft);
  }

  async findAll(): Promise<Draft[]> {
    return this.draftRepository.find({ relations: ['user'] });
  }

  async findOne(id: string): Promise<Draft> {
    if (!id) {
      throw new BadRequestException('Invalid draft ID');
    }
    const draft = await this.draftRepository.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!draft) {
      throw new NotFoundException('Draft not found');
    }
    return draft;
  }

  async update(id: string, updateDraftDto: UpdateDraftDto): Promise<Draft> {
    const result = await this.draftRepository.update(id, updateDraftDto);
    if (result.affected === 0) {
      throw new NotFoundException('Draft not found');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.draftRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Draft not found');
    }
  }

  async findByUser(userId: string): Promise<Draft[]> {
    if (!userId) {
      throw new BadRequestException('Invalid user ID');
    }
    return this.draftRepository.find({
      where: { user_id: userId },
      relations: ['user'],
    });
  }

  // ── Translation CRUD ──

  async getTranslations(draftId: string): Promise<DraftTranslation[]> {
    return this.draftTranslationRepository.find({ where: { draft_id: draftId } });
  }

  async upsertTranslation(
    draftId: string,
    locale: string,
    dto: CreateDraftTranslationDto | UpdateDraftTranslationDto,
  ): Promise<DraftTranslation> {
    await this.findOne(draftId);

    let translation = await this.draftTranslationRepository.findOne({
      where: { draft_id: draftId, locale },
    });

    if (translation) {
      Object.assign(translation, dto);
    } else {
      translation = this.draftTranslationRepository.create({
        draft_id: draftId,
        locale,
        ...dto,
      });
    }

    return this.draftTranslationRepository.save(translation);
  }

  async deleteTranslation(draftId: string, locale: string): Promise<void> {
    const result = await this.draftTranslationRepository.delete({
      draft_id: draftId,
      locale,
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Translation not found for locale: ${locale}`);
    }
  }
}
