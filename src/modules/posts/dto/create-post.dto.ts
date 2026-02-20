import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  IsUUID,
} from 'class-validator';

export enum PostStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
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
  category_ids?: string[]; // Array of category IDs for many-to-many

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsString()
  featured_image?: string;

  @IsOptional()
  @IsDateString()
  published_at?: string;
}
