import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum PostStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum PostType {
  STANDARD = 'standard',
  OPINION = 'opinion',
  VIDEO = 'video',
  AUDIO = 'audio',
  GALLERY = 'gallery',
}

export class CreatePostDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  user_id?: string;

  @IsNotEmpty()
  @IsString()
  category_id: string; // Legacy field - first category

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return []; }
    }
    return value;
  })
  category_ids?: string[]; // Array of category IDs for many-to-many

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsEnum(PostType)
  post_type?: PostType;

  @IsOptional()
  @IsString()
  featured_image?: string;

  @IsOptional()
  @IsString()
  video_url?: string;

  @IsOptional()
  @IsDateString()
  published_at?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return []; }
    }
    return value;
  })
  tag_ids?: string[]; // Array of tag IDs

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try { return JSON.parse(value); } catch { return []; }
    }
    return value;
  })
  media_ids?: string[]; // Array of media IDs to attach to post
}
