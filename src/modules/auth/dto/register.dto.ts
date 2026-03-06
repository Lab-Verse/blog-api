import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsUUID,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { Role } from '../../../common/enums/role.enum';
import { UserStatus } from 'src/modules/users/entities/user.entity';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  username: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

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
}
