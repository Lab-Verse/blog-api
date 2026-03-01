import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT guard — attaches user to request if a valid token is present,
 * but allows anonymous access (req.user will be undefined).
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers?.authorization;

    // No token → allow through anonymously
    if (!authHeader) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest<TUser = { id: string; email?: string; role_id?: string }>(
    err: Error | null,
    user: TUser | false,
  ): TUser | undefined {
    // If token is invalid, just treat as anonymous instead of throwing
    if (err || !user) {
      return undefined as unknown as TUser;
    }
    return user;
  }
}
