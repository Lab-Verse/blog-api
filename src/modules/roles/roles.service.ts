import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { User } from '../users/entities/user.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RolePermission } from '../role-permissions/entities/role-permission.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RolePermission) // ✅ Add this
    private rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const role = this.roleRepository.create(createRoleDto);
    return await this.roleRepository.save(role);
  }

  async findAll(): Promise<Role[]> {
    return await this.roleRepository.find();
  }

  async findOne(id: string): Promise<Role> {
    if (!id) throw new BadRequestException('Invalid role ID');

    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role not found with id: ${id}`);
    }
    return role;
  }

  async update(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    if (!id) throw new BadRequestException('Invalid role ID');

    const result = await this.roleRepository.update(id, updateRoleDto);
    if (result.affected === 0) {
      throw new NotFoundException(`Role not found with id: ${id}`);
    }
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    if (!id) throw new BadRequestException('Invalid role ID');

    const result = await this.roleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Role not found with id: ${id}`);
    }
  }

  async getPermissions(roleId: string) {
    if (!roleId) {
      throw new BadRequestException('Invalid role ID');
    }

    // ✅ Check role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role not found with id: ${roleId}`);
    }

    // ✅ Get all permissions linked to this role
    const rolePermissions = await this.rolePermissionRepository.find({
      where: { role_id: roleId },
      relations: ['permission'],
    });

    // ✅ Extract and return just the permissions
    return rolePermissions.map((rp) => rp.permission);
  }

  async getUsers(roleId: string): Promise<User[]> {
    if (!roleId) throw new BadRequestException('Invalid role ID');

    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException(`Role not found with id: ${roleId}`);
    }

    return await this.userRepository.find({
      where: { role_id: roleId },
    });
  }

  async findById(id: string): Promise<Role> {
    return this.findOne(id); // ✅ reuse logic
  }

  async findBySlug(slug: string): Promise<Role | null> {
    return this.roleRepository.findOne({ where: { slug } });
  }
}
