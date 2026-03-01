import { PartialType } from '@nestjs/mapped-types';
import { CreateEMagazineDto } from './create-e-magazine.dto';

export class UpdateEMagazineDto extends PartialType(CreateEMagazineDto) {}
