import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Post } from '../posts/entities/post.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,

    @InjectRepository(Post)
    private postRepository: Repository<Post>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const category = this.categoryRepository.create(createCategoryDto);
    return this.categoryRepository.save(category);
  }

  async findAll(): Promise<Category[]> {
    const categories = await this.categoryRepository.find();
    return categories;
  }

  async findOne(id: string): Promise<Category> {
    if (!id) {
      throw new BadRequestException('Invalid category ID');
    }
    const category = await this.categoryRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
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
}
