import { PartialType } from '@nestjs/mapped-types';
import { CreateLeadershipMemberDto } from './create-leadership-member.dto';

export class UpdateLeadershipMemberDto extends PartialType(
  CreateLeadershipMemberDto,
) {}
