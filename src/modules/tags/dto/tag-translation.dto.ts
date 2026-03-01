import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTagTranslationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5)
  locale: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  slug: string;
}

export class UpdateTagTranslationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;
}
