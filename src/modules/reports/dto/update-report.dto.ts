import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ReportStatus_enum, reason_enum } from './create-report.dto';

export class UpdateReportDto {
  @IsOptional()
  @IsEnum(reason_enum)
  reason?: reason_enum;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ReportStatus_enum)
  status?: ReportStatus_enum;
}
