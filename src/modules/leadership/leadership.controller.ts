import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LeadershipService } from './leadership.service';
import { CreateLeadershipMemberDto } from './dto/create-leadership-member.dto';
import { UpdateLeadershipMemberDto } from './dto/update-leadership-member.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('leadership-members')
export class LeadershipController {
  constructor(private readonly leadershipService: LeadershipService) {}

  /**
   * POST /leadership-members — Create a new leadership member.
   * Multipart form: photo (optional image) + JSON fields.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async create(
    @Body() dto: CreateLeadershipMemberDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    try {
      return await this.leadershipService.create(dto, photo);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to create leadership member';
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * GET /leadership-members — Public listing of active members (by default).
   * Pass ?active=false to include inactive members (admin use).
   */
  @Get()
  async findAll(@Query('active') active?: string) {
    const onlyActive = active !== 'false';
    return this.leadershipService.findAll(onlyActive);
  }

  /**
   * GET /leadership-members/:id — Get a single member by ID.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.leadershipService.findOne(id);
  }

  /**
   * PATCH /leadership-members/:id — Update a member.
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('photo', {
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLeadershipMemberDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.leadershipService.update(id, dto, photo);
  }

  /**
   * PATCH /leadership-members/reorder — Bulk reorder members.
   * Body: { ids: string[] } — array of member IDs in desired order.
   */
  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  async reorder(@Body('ids') ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new HttpException(
        'ids must be a non-empty array',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.leadershipService.reorder(ids);
    return { message: 'Reordered successfully' };
  }

  /**
   * DELETE /leadership-members/:id — Delete a member and its R2 photo.
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string) {
    await this.leadershipService.remove(id);
    return { message: 'Deleted successfully' };
  }
}
