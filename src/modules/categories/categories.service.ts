import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CategoryTranslation } from './entities/category-translation.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateCategoryTranslationDto, UpdateCategoryTranslationDto } from './dto/category-translation.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Post } from '../posts/entities/post.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,

    @InjectRepository(CategoryTranslation)
    private categoryTranslationRepository: Repository<CategoryTranslation>,

    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  private overlayTranslation(category: Category, locale?: string): Category {
    if (!locale || locale === 'en') return category;
    const t = category.translations?.find((tr) => tr.locale === locale);
    if (t) {
      category.name = t.name;
      category.slug = t.slug;
    }
    return category;
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  async findAll(locale?: string): Promise<Category[]> {
    const categories = await this.categoryRepository.find({ relations: ['translations'] });
    return categories.map((c) => this.overlayTranslation(c, locale));
  }

  async findOne(id: string, locale?: string): Promise<Category> {
    if (!id) {
      throw new BadRequestException('Invalid category ID');
    }
    const category = await this.categoryRepository.findOne({ where: { id }, relations: ['translations'] });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return this.overlayTranslation(category, locale);
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const result = await this.categoryRepository.update(id, updateCategoryDto);
    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.categoryRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Category not found');
    }
  }

  async getPosts(categoryId: string) {
    if (!categoryId) {
      throw new BadRequestException('Invalid category ID');
    }

    return this.postRepository.find({
      where: { category: { id: categoryId } },
      relations: ['user', 'category'], // ✅ use "user" instead of "author"
    });
  }

  async getFollowers(categoryId: string) {
    if (!categoryId) {
      throw new BadRequestException('Invalid category ID');
    }
    // Return empty array - implement when CategoryFollower entity is properly related
    return [];
  }

  // ── Translation CRUD ──

  async getTranslations(categoryId: string): Promise<CategoryTranslation[]> {
    return this.categoryTranslationRepository.find({ where: { category_id: categoryId } });
  }

  async upsertTranslation(
    categoryId: string,
    locale: string,
    dto: CreateCategoryTranslationDto | UpdateCategoryTranslationDto,
  ): Promise<CategoryTranslation> {
    await this.findOne(categoryId);

    let translation = await this.categoryTranslationRepository.findOne({
      where: { category_id: categoryId, locale },
    });

    if (translation) {
      Object.assign(translation, dto);
    } else {
      translation = this.categoryTranslationRepository.create({
        category_id: categoryId,
        locale,
        ...dto,
      });
    }

    return this.categoryTranslationRepository.save(translation);
  }

  async deleteTranslation(categoryId: string, locale: string): Promise<void> {
    const result = await this.categoryTranslationRepository.delete({
      category_id: categoryId,
      locale,
    });
    if (result.affected === 0) {
      throw new NotFoundException(`Translation not found for locale: ${locale}`);
    }
  }
}
