import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsNotEmpty()
  @IsString()
  post_id: string;

  @IsOptional()
  @IsString()
  parent_id?: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
