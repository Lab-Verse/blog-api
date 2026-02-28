import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value === '' || value === 'null' || value === null || value === undefined ? undefined : value)
  parent_id?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return Boolean(value);
  })
  is_active?: boolean;

  @IsOptional()
  @IsString()
  image_url?: string;
}
