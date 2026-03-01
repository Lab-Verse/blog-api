import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ViewsService } from './views.service';
import { View } from './entities/view.entity';
import { Post } from '../posts/entities/post.entity';
import { Repository } from 'typeorm';

// Helper to create mock repositories
function createMockRepository() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    increment: jest.fn(),
  };
}

describe('ViewsService', () => {
  let service: ViewsService;
  let viewRepo: ReturnType<typeof createMockRepository>;
  let postRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    viewRepo = createMockRepository();
    postRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViewsService,
        { provide: getRepositoryToken(View), useValue: viewRepo },
        { provide: getRepositoryToken(Post), useValue: postRepo },
      ],
    }).compile();

    service = module.get<ViewsService>(ViewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create (view recording with dedup)', () => {
    const baseDto = {
      viewable_type: 'post',
      viewable_id: 'post-123',
      ip_address: '192.168.1.1',
    };

    it('creates a new view when no duplicate exists', async () => {
      viewRepo.findOne.mockResolvedValue(null);
      const mockView = { id: '1', ...baseDto, created_at: new Date() };
      viewRepo.create.mockReturnValue(mockView);
      viewRepo.save.mockResolvedValue(mockView);

      const result = await service.create(baseDto);

      expect(viewRepo.findOne).toHaveBeenCalled();
      expect(viewRepo.create).toHaveBeenCalledWith(baseDto);
      expect(viewRepo.save).toHaveBeenCalledWith(mockView);
      expect(postRepo.increment).toHaveBeenCalledWith(
        { id: 'post-123' },
        'views_count',
        1,
      );
      expect(result).toEqual(mockView);
    });

    it('returns existing view without incrementing when duplicate found', async () => {
      const existingView = { id: '99', ...baseDto, created_at: new Date() };
      viewRepo.findOne.mockResolvedValue(existingView);

      const result = await service.create(baseDto);

      expect(viewRepo.findOne).toHaveBeenCalled();
      expect(viewRepo.create).not.toHaveBeenCalled();
      expect(viewRepo.save).not.toHaveBeenCalled();
      expect(postRepo.increment).not.toHaveBeenCalled();
      expect(result).toEqual(existingView);
    });

    it('creates view for authenticated user (includes user_id in dedup)', async () => {
      const dto = { ...baseDto, user_id: 'user-456' };
      viewRepo.findOne.mockResolvedValue(null);
      const mockView = { id: '2', ...dto, created_at: new Date() };
      viewRepo.create.mockReturnValue(mockView);
      viewRepo.save.mockResolvedValue(mockView);

      await service.create(dto);

      // The findOne should use OR conditions for user_id and ip_address
      const findOneCall = viewRepo.findOne.mock.calls[0][0];
      expect(findOneCall.where).toBeDefined();
      expect(findOneCall.where.length).toBe(2); // user_id check + ip_address check
    });

    it('creates view for anonymous user (only IP in dedup)', async () => {
      viewRepo.findOne.mockResolvedValue(null);
      const mockView = { id: '3', ...baseDto, created_at: new Date() };
      viewRepo.create.mockReturnValue(mockView);
      viewRepo.save.mockResolvedValue(mockView);

      await service.create(baseDto);

      // The findOne should only have IP-based dedup (no user_id)
      const findOneCall = viewRepo.findOne.mock.calls[0][0];
      expect(findOneCall.where).toBeDefined();
      expect(findOneCall.where.length).toBe(1); // Only ip_address check
    });

    it('does NOT increment post views_count for non-post viewable types', async () => {
      const dto = { ...baseDto, viewable_type: 'page' };
      viewRepo.findOne.mockResolvedValue(null);
      const mockView = { id: '4', ...dto, created_at: new Date() };
      viewRepo.create.mockReturnValue(mockView);
      viewRepo.save.mockResolvedValue(mockView);

      await service.create(dto);

      expect(postRepo.increment).not.toHaveBeenCalled();
    });
  });

  describe('findByUser', () => {
    it('throws BadRequestException for empty userId', async () => {
      await expect(service.findByUser('')).rejects.toThrow('Invalid user ID');
    });

    it('returns views for a valid userId', async () => {
      const mockViews = [{ id: '1', user_id: 'user-1' }];
      viewRepo.find.mockResolvedValue(mockViews);

      const result = await service.findByUser('user-1');

      expect(viewRepo.find).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        relations: ['user', 'post'],
      });
      expect(result).toEqual(mockViews);
    });
  });

  describe('findByPost', () => {
    it('throws BadRequestException for empty postId', async () => {
      await expect(service.findByPost('')).rejects.toThrow('Invalid post ID');
    });

    it('returns views for a valid postId', async () => {
      const mockViews = [{ id: '1', viewable_id: 'post-1', viewable_type: 'post' }];
      viewRepo.find.mockResolvedValue(mockViews);

      const result = await service.findByPost('post-1');

      expect(viewRepo.find).toHaveBeenCalledWith({
        where: { viewable_id: 'post-1', viewable_type: 'post' },
        relations: ['user', 'post'],
      });
      expect(result).toEqual(mockViews);
    });
  });
});
