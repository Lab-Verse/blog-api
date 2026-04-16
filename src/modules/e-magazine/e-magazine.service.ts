import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { EMagazine } from './entities/e-magazine.entity';
import { CreateEMagazineDto } from './dto/create-e-magazine.dto';
import { UpdateEMagazineDto } from './dto/update-e-magazine.dto';
import { Tag } from '../tags/entities/tag.entity';
import { CloudflareService } from '../../common/services/cloudflare.service';
import { execFile } from 'child_process';
import { writeFile, readFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

@Injectable()
export class EMagazineService {
  private readonly logger = new Logger(EMagazineService.name);
  private static readonly MAX_PDF_SIZE = 25 * 1024 * 1024; // 25 MB

  constructor(
    @InjectRepository(EMagazine)
    private eMagazineRepository: Repository<EMagazine>,
    @InjectRepository(Tag)
    private tagRepository: Repository<Tag>,
    private cloudflareService: CloudflareService,
  ) {}

  /**
   * Compress a PDF buffer using Ghostscript.
   * Tries /ebook quality first; if still over MAX_PDF_SIZE, falls back to /screen.
   * Returns the (possibly compressed) buffer and its size.
   */
  private async compressPdf(
    buffer: Buffer,
    originalName: string,
  ): Promise<{ buffer: Buffer; size: number }> {
    if (buffer.length <= EMagazineService.MAX_PDF_SIZE) {
      return { buffer, size: buffer.length };
    }

    const dir = await mkdtemp(join(tmpdir(), 'pdf-'));
    const inputPath = join(dir, 'input.pdf');
    const outputPath = join(dir, 'output.pdf');

    try {
      await writeFile(inputPath, buffer);

      let lastCompressed: Buffer | null = null;

      for (const preset of ['/ebook', '/screen'] as const) {
        try {
          await this.runGhostscript(inputPath, outputPath, preset);
          const compressed = await readFile(outputPath);
          lastCompressed = compressed;

          this.logger.log(
            `PDF "${originalName}" compressed with ${preset}: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → ${(compressed.length / 1024 / 1024).toFixed(1)}MB`,
          );

          if (compressed.length <= EMagazineService.MAX_PDF_SIZE) {
            return { buffer: compressed, size: compressed.length };
          }
        } catch (gsError) {
          this.logger.warn(
            `Ghostscript (${preset}) failed for "${originalName}": ${gsError instanceof Error ? gsError.message : gsError}`,
          );
          // Continue to next preset instead of aborting
        }
      }

      // Both presets either failed or couldn't compress below threshold
      if (lastCompressed && lastCompressed.length < buffer.length) {
        // Return best-effort compressed version if it's at least smaller
        this.logger.warn(
          `PDF "${originalName}" compressed but still over 25MB (${(lastCompressed.length / 1024 / 1024).toFixed(1)}MB). Uploading best-effort result.`,
        );
        return { buffer: lastCompressed, size: lastCompressed.length };
      }

      throw new BadRequestException(
        `PDF file "${originalName}" (${(buffer.length / 1024 / 1024).toFixed(1)}MB) could not be compressed below 25MB. ` +
        `Please reduce the file size manually and try again.`,
      );
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    }
  }

  private runGhostscript(
    input: string,
    output: string,
    preset: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      execFile(
        'gs',
        [
          '-sDEVICE=pdfwrite',
          '-dCompatibilityLevel=1.4',
          `-dPDFSETTINGS=${preset}`,
          '-dNOPAUSE',
          '-dBATCH',
          '-dQUIET',
          `-sOutputFile=${output}`,
          input,
        ],
        { timeout: 120_000 },
        (error) => {
          if (error) {
            this.logger.warn(`Ghostscript (${preset}) failed: ${error.message}`);
            reject(error);
          } else {
            resolve();
          }
        },
      );
    });
  }

  /**
   * Generate a URL-friendly slug from a title, ensuring uniqueness.
   */
  private async generateSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = base;
    let counter = 1;
    while (await this.eMagazineRepository.findOne({ where: { slug } })) {
      slug = `${base}-${counter}`;
      counter++;
    }
    return slug;
  }

  async create(
    dto: CreateEMagazineDto,
    uploadedBy: string,
    pdfFile: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ): Promise<EMagazine> {
    if (!pdfFile) {
      throw new BadRequestException('PDF file is required');
    }

    // Compress PDF if over 25MB
    const { buffer: pdfBuffer, size: pdfSize } = await this.compressPdf(
      pdfFile.buffer,
      pdfFile.originalname,
    );

    // Upload PDF to R2
    const pdfFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${pdfFile.originalname}`;
    const pdfUrl = await this.cloudflareService.uploadFile(
      pdfBuffer,
      pdfFilename,
      'e-magazines',
    );

    // Upload cover image to R2 (optional)
    let coverImageUrl: string | undefined;
    if (coverFile) {
      const coverFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${coverFile.originalname}`;
      coverImageUrl = await this.cloudflareService.uploadFile(
        coverFile.buffer,
        coverFilename,
        'e-magazines/covers',
      );
    }

    const slug = await this.generateSlug(dto.title);

    // Resolve tags
    let tags: Tag[] = [];
    if (dto.tag_ids?.length) {
      tags = await this.tagRepository.find({
        where: { id: In(dto.tag_ids) },
      });
    }

    const magazine = this.eMagazineRepository.create({
      title: dto.title,
      slug,
      description: dto.description,
      cover_image_url: coverImageUrl,
      pdf_url: pdfUrl,
      issue_number: dto.issue_number,
      published_date: dto.published_date ? new Date(dto.published_date) : undefined,
      status: dto.status || 'draft',
      page_count: dto.page_count,
      file_size: pdfSize,
      category_id: dto.category_id,
      uploaded_by: uploadedBy,
      tags,
    });

    return this.eMagazineRepository.save(magazine);
  }

  async findAll(filters?: {
    status?: string;
    categoryId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: EMagazine[]; total: number; page: number; limit: number }> {
    const limit = filters?.limit ?? 12;
    const page = filters?.page ?? 1;
    const offset = (page - 1) * limit;

    const query = this.eMagazineRepository
      .createQueryBuilder('mag')
      .leftJoinAndSelect('mag.user', 'user')
      .leftJoinAndSelect('mag.category', 'category')
      .leftJoinAndSelect('mag.tags', 'tags');

    if (filters?.status) {
      query.andWhere('mag.status = :status', { status: filters.status });
    }

    if (filters?.categoryId) {
      query.andWhere('mag.category_id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.search) {
      query.andWhere(
        '(mag.title ILIKE :search OR mag.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    query
      .orderBy('mag.issue_number', 'DESC')
      .skip(offset)
      .take(limit);

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, limit };
  }

  async findBySlug(slugOrId: string): Promise<EMagazine> {
    if (!slugOrId) {
      throw new BadRequestException('Slug or ID is required');
    }

    // If input looks like a UUID, try finding by ID first
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

    let magazine: EMagazine | null = null;
    if (isUuid) {
      magazine = await this.eMagazineRepository.findOne({
        where: { id: slugOrId },
        relations: ['user', 'category', 'tags'],
      });
    }
    if (!magazine) {
      magazine = await this.eMagazineRepository.findOne({
        where: { slug: slugOrId },
        relations: ['user', 'category', 'tags'],
      });
    }
    if (!magazine) {
      throw new NotFoundException('E-Magazine not found');
    }
    return magazine;
  }

  async findOne(id: string): Promise<EMagazine> {
    if (!id) {
      throw new BadRequestException('Invalid e-magazine ID');
    }
    const magazine = await this.eMagazineRepository.findOne({
      where: { id },
      relations: ['user', 'category', 'tags'],
    });
    if (!magazine) {
      throw new NotFoundException('E-Magazine not found');
    }
    return magazine;
  }

  async update(
    id: string,
    dto: UpdateEMagazineDto,
    pdfFile?: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ): Promise<EMagazine> {
    const magazine = await this.findOne(id);

    // Upload new PDF if provided
    if (pdfFile) {
      // Compress PDF if over 25MB
      const { buffer: pdfBuffer, size: pdfSize } = await this.compressPdf(
        pdfFile.buffer,
        pdfFile.originalname,
      );

      // Delete old PDF
      if (magazine.pdf_url) {
        await this.cloudflareService.deleteFile(magazine.pdf_url).catch(() => {});
      }
      const pdfFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${pdfFile.originalname}`;
      magazine.pdf_url = await this.cloudflareService.uploadFile(
        pdfBuffer,
        pdfFilename,
        'e-magazines',
      );
      magazine.file_size = pdfSize;
    }

    // Upload new cover if provided
    if (coverFile) {
      if (magazine.cover_image_url) {
        await this.cloudflareService.deleteFile(magazine.cover_image_url).catch(() => {});
      }
      const coverFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${coverFile.originalname}`;
      magazine.cover_image_url = await this.cloudflareService.uploadFile(
        coverFile.buffer,
        coverFilename,
        'e-magazines/covers',
      );
    }

    // Update scalar fields
    if (dto.title !== undefined) {
      magazine.title = dto.title;
      magazine.slug = await this.generateSlug(dto.title);
    }
    if (dto.description !== undefined) magazine.description = dto.description;
    if (dto.issue_number !== undefined) magazine.issue_number = dto.issue_number;
    if (dto.published_date !== undefined)
      magazine.published_date = new Date(dto.published_date);
    if (dto.status !== undefined) magazine.status = dto.status;
    if (dto.page_count !== undefined) magazine.page_count = dto.page_count;
    if (dto.category_id !== undefined) magazine.category_id = dto.category_id;

    // Update tags
    if (dto.tag_ids) {
      magazine.tags = dto.tag_ids.length
        ? await this.tagRepository.find({ where: { id: In(dto.tag_ids) } })
        : [];
    }

    return this.eMagazineRepository.save(magazine);
  }

  async remove(id: string): Promise<void> {
    const magazine = await this.findOne(id);

    // Clean up files from R2
    if (magazine.pdf_url) {
      await this.cloudflareService.deleteFile(magazine.pdf_url).catch(() => {});
    }
    if (magazine.cover_image_url) {
      await this.cloudflareService
        .deleteFile(magazine.cover_image_url)
        .catch(() => {});
    }

    const result = await this.eMagazineRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('E-Magazine not found');
    }
  }
}
