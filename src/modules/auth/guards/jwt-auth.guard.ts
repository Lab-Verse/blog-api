import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    const routePath =
      request.route &&
      typeof request.route === 'object' &&
      'path' in request.route
        ? (request.route as { path: string }).path
        : null;
    const path: string = routePath || request.url.split('?')[0];

    // Skip JWT auth for public auth routes (not admin routes)
    const publicAuthRoutes = [
      '/auth/login',
      '/auth/register',
      '/auth/front-login',
      '/auth/forgot-password',
      '/auth/reset-password',
      '/auth/refresh',
      '/auth/refresh-token',
    ];
    
    if (publicAuthRoutes.some(route => path.startsWith(route))) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = { id: string; email?: string; role_id?: string }>(
    err: Error | null,
    user: TUser | false,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
