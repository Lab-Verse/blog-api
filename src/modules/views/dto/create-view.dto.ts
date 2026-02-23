import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class CreateViewDto {
  @IsOptional()
  @IsString()
  user_id?: string;

  @IsNotEmpty()
  @IsString()
  viewable_type: string;

  @IsNotEmpty()
  @IsString()
  viewable_id: string;

  @IsOptional()
  @IsString()
  ip_address: string;
}
