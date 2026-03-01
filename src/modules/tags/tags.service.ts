import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tag } from './entities/tag.entity';
import { TagTranslation } from './entities/tag-translation.entity';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { CreateTagTranslationDto, UpdateTagTranslationDto } from './dto/tag-translation.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    @InjectRepository(TagTranslation)
    private tagTranslationRepository: Repository<TagTranslation>,
  ) {}

  private overlayTranslation(tag: Tag, locale?: string): Tag {
    if (!locale || locale === 'en') return tag;
    const t = tag.translations?.find((tr) => tr.locale === locale);
    if (t) {
      tag.name = t.name;
      tag.slug = t.slug;
    }
    return tag;
  }

  async create(createTagDto: CreateTagDto): Promise<Tag> {
    const tag = this.tagRepository.create(createTagDto);
    return this.tagRepository.save(tag);
  }

  async findAll(locale?: string): Promise<Tag[]> {
    const tags = await this.tagRepository.find({ relations: ['translations'] });
    return tags.map((t) => this.overlayTranslation(t, locale));
  }

  async findOne(id: string, locale?: string): Promise<Tag> {
    if (!id) {
      throw new BadRequestException('Invalid tag ID');
    }
    const tag = await this.tagRepository.findOne({ where: { id }, relations: ['translations'] });
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }
    return this.overlayTranslation(tag, locale);
  }

  async update(id: string, updateTagDto: UpdateTagDto): Promise<Tag> {
    const result = await this.tagRepository.update(id, updateTagDto);
    if (result.affected === 0) {
      throw new NotFoundException('Tag not found');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.tagRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Tag not found');
    }
  }

  async getPosts(tagId: string) {
    if (!tagId) {
      throw new BadRequestException('Invalid tag ID');
    }

    return [];
  }

  // ── Translation CRUD ──

  async getTranslations(tagId: string): Promise<TagTranslation[]> {
    return this.tagTranslationRepository.find({ where: { tag_id: tagId } });
  }

  async upsertTranslation(
    tagId: string,
    locale: string,
    dto: CreateTagTranslationDto | UpdateTagTranslationDto,
  ): Promise<TagTranslation> {
    await this.findOne(tagId);

    let translation = await this.tagTranslationRepository.findOne({
      where: { tag_id: tagId, locale },
    });

    if (translation) {
      Object.assign(translation, dto);
    } else {
      translation = this.tagTranslationRepository.create({
        tag_id: tagId,
        locale,
        ...dto,
      });
    }

    return this.tagTranslationRepository.save(translation);
  }

  async deleteTranslation(tagId: string, locale: string): Promise<void> {
    const result = await this.tagTranslationRepository.delete({
      tag_id: tagId,
      locale,
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Translation not found for locale: ${locale}`);
    }
  }
}
