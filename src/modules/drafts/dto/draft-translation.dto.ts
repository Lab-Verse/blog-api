import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDraftTranslationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(5)
  locale: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

export class UpdateDraftTranslationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
