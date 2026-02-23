import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCommentReplyDto {
  @IsUUID()
  comment_id: string;

  @IsOptional()
  @IsString()
  user_id: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
