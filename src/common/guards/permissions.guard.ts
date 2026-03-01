import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { RolePermissionsService } from 'src/modules/role-permissions/role-permissions.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role_id?: string;
    role?: string;
  };
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rolePermissionsService: RolePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If route doesn't require permissions → allow
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    if (!user.role_id) {
      throw new ForbiddenException(
        `User role_id not found. User object: ${JSON.stringify(user)}`,
      );
    }

    // ✅ Get permissions for role
    const rolePermissions = await this.rolePermissionsService.findByRole(
      user.role_id,
    );
    const userPermissions = rolePermissions.map(
      (rp) => rp.permission.slug, // use `slug` for matching
    );

    // ✅ Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Role "${user.role}" does not have required permissions: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
