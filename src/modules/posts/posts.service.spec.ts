import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PostsService } from './posts.service';
import { Post } from './entities/post.entity';

// Minimal mock query builder with chainable methods
function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainMethods = [
    'select', 'leftJoinAndSelect', 'andWhere', 'orderBy', 'skip', 'take',
  ];
  chainMethods.forEach((m) => {
    qb[m] = jest.fn().mockReturnValue(qb);
  });
  qb['getManyAndCount'] = jest.fn().mockResolvedValue([[], 0]);
  return qb;
}

describe('PostsService — findAll', () => {
  let service: PostsService;
  let mockQB: ReturnType<typeof createMockQueryBuilder>;

  beforeEach(async () => {
    mockQB = createMockQueryBuilder();

    const mockRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQB),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PostsService,
          useFactory: () => {
            // Minimal instance with just the repo injected
            const svc = Object.create(PostsService.prototype);
            svc.postRepository = mockRepo;
            // Provide a no-op overlayTranslation
            svc.overlayTranslation = (p: any) => p;
            return svc;
          },
        },
      ],
    }).compile();

    service = module.get(PostsService);
  });

  it('applies default pagination (page=1, limit=20)', async () => {
    const result = await service.findAll();

    expect(mockQB.skip).toHaveBeenCalledWith(0);
    expect(mockQB.take).toHaveBeenCalledWith(20);
    expect(result).toEqual({ data: [], total: 0, limit: 20, page: 1 });
  });

  it('applies custom pagination', async () => {
    await service.findAll({ page: 3, limit: 10 });

    expect(mockQB.skip).toHaveBeenCalledWith(20); // (3-1)*10
    expect(mockQB.take).toHaveBeenCalledWith(10);
  });

  it('filters by categoryId', async () => {
    await service.findAll({ categoryId: 'cat-1' });

    expect(mockQB.andWhere).toHaveBeenCalledWith(
      'category.id = :categoryId',
      { categoryId: 'cat-1' },
    );
  });

  it('filters by tagId', async () => {
    await service.findAll({ tagId: 'tag-1' });

    expect(mockQB.andWhere).toHaveBeenCalledWith(
      'tag.id = :tagId',
      { tagId: 'tag-1' },
    );
  });

  it('filters by userId', async () => {
    await service.findAll({ userId: 'user-1' });

    expect(mockQB.andWhere).toHaveBeenCalledWith(
      'post.user_id = :userId',
      { userId: 'user-1' },
    );
  });

  it('filters by search term', async () => {
    await service.findAll({ search: 'hello' });

    expect(mockQB.andWhere).toHaveBeenCalledWith(
      '(post.title ILIKE :search OR post.excerpt ILIKE :search OR post.description ILIKE :search)',
      { search: '%hello%' },
    );
  });

  it('sorts by allowed field', async () => {
    await service.findAll({ sortBy: 'likes_count', sortOrder: 'DESC' });

    expect(mockQB.orderBy).toHaveBeenCalledWith('post.likes_count', 'DESC');
  });

  it('sorts ASC when specified', async () => {
    await service.findAll({ sortBy: 'title', sortOrder: 'ASC' });

    expect(mockQB.orderBy).toHaveBeenCalledWith('post.title', 'ASC');
  });

  it('defaults to created_at DESC for invalid sort field', async () => {
    await service.findAll({ sortBy: 'hacked_field' });

    expect(mockQB.orderBy).toHaveBeenCalledWith('post.created_at', 'DESC');
  });

  it('applies multiple filters together', async () => {
    await service.findAll({
      categoryId: 'cat-1',
      tagId: 'tag-1',
      search: 'test',
      page: 2,
      limit: 5,
      sortBy: 'views_count',
      sortOrder: 'DESC',
    });

    expect(mockQB.andWhere).toHaveBeenCalledTimes(3); // category + tag + search
    expect(mockQB.skip).toHaveBeenCalledWith(5); // (2-1)*5
    expect(mockQB.take).toHaveBeenCalledWith(5);
    expect(mockQB.orderBy).toHaveBeenCalledWith('post.views_count', 'DESC');
  });
});
