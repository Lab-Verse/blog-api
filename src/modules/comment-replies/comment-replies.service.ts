import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CommentReply } from './entities/comment-reply.entity';
import { CreateCommentReplyDto } from './dto/create-comment-reply.dto';
import { UpdateCommentReplyDto } from './dto/update-comment-reply.dto';
import { Comment } from '../comments/entities/comment.entity';

@Injectable()
export class CommentRepliesService {
  constructor(
    @InjectRepository(CommentReply)
    private commentReplyRepository: Repository<CommentReply>,

    @InjectRepository(Comment)
    private commentRepository: Repository<Comment>,
  ) {}

  async create(
    createCommentReplyDto: CreateCommentReplyDto,
  ): Promise<CommentReply> {
    const reply = this.commentReplyRepository.create(createCommentReplyDto);
    const savedReply = await this.commentReplyRepository.save(reply);

    // Increment the parent comment's replies_count
    await this.commentRepository.increment(
      { id: createCommentReplyDto.comment_id },
      'replies_count',
      1,
    );

    return savedReply;
  }

  async findOne(id: string): Promise<CommentReply> {
    if (!id) {
      throw new BadRequestException('Invalid comment reply ID');
    }
    const reply = await this.commentReplyRepository.findOne({
      where: { id },
      relations: ['user', 'comment'],
    });
    if (!reply) {
      throw new NotFoundException('Comment reply not found');
    }
    return reply;
  }

  async update(
    id: string,
    updateCommentReplyDto: UpdateCommentReplyDto,
  ): Promise<CommentReply> {
    const result = await this.commentReplyRepository.update(
      id,
      updateCommentReplyDto,
    );
    if (result.affected === 0) {
      throw new NotFoundException('Comment reply not found');
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const reply = await this.commentReplyRepository.findOne({ where: { id } });
    if (!reply) {
      throw new NotFoundException('Comment reply not found');
    }

    const result = await this.commentReplyRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Comment reply not found');
    }

    // Decrement the parent comment's replies_count
    await this.commentRepository.decrement(
      { id: reply.comment_id },
      'replies_count',
      1,
    );
  }

  async findByComment(commentId: string): Promise<CommentReply[]> {
    if (!commentId) {
      throw new BadRequestException('Invalid comment ID');
    }
    return this.commentReplyRepository.find({
      where: { comment_id: commentId },
      relations: ['user'],
    });
  }
}
