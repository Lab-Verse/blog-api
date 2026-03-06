import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '../../../common/enums/role.enum';

export enum UserStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
}

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsEnum(Role)
  @Transform(({ value }) => value || 'author')
  role?: string = 'author';

  @IsUUID()
  @IsOptional()
  role_id?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  @Transform(({ value }) => value || UserStatus.ACTIVE)
  status?: UserStatus = UserStatus.ACTIVE;

  @IsOptional()
  @IsBoolean()
  can_publish?: boolean = false;
}
