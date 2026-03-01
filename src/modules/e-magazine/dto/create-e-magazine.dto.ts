import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEMagazineDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  issue_number: number;

  @IsOptional()
  @IsString()
  published_date?: string;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page_count?: number;

  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tag_ids?: string[];
}
