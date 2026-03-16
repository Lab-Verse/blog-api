import { IsOptional, IsString, IsInt, IsBoolean, Min, Max, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateAgentConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  max_posts_per_session?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(1440)
  pipeline_interval_minutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(7200)
  stagger_delay_seconds?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  max_article_age_hours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  max_articles_per_category?: number;

  @IsOptional()
  @IsBoolean()
  require_featured_image?: boolean;

  @IsOptional()
  @IsString()
  image_strategy?: string; // source_attribution | ai_generate | ai_with_fallback

  @IsOptional()
  @IsString()
  image_ai_provider?: string; // pollinations | huggingface | gemini

  @IsOptional()
  @IsBoolean()
  auto_publish?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories_enabled?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories_requiring_review?: string[];
}
