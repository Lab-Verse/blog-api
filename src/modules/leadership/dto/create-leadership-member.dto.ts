import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsUUID,
  IsUrl,
  IsEmail,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateLeadershipMemberDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  designation: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website_url?: string;

  @IsOptional()
  @IsString()
  twitter_url?: string;

  @IsOptional()
  @IsString()
  linkedin_url?: string;

  @IsOptional()
  @IsString()
  facebook_url?: string;

  @IsOptional()
  @IsString()
  instagram_url?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  display_order?: number;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsUUID()
  user_id?: string;
}
