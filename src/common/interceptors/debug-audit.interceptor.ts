import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';
import { AUDIT_KEY, AuditOptions } from '../decorators/audit.decorator';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role_id?: string;
    role?: string;
    sub?: string;
  };
}

@Injectable()
export class DebugAuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private auditLogsService: AuditLogsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditOptions = this.reflector.get<AuditOptions>(
      AUDIT_KEY,
      context.getHandler(),
    );

    if (!auditOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    const ip = request.ip || request.socket?.remoteAddress || 'unknown';

    return next.handle().pipe(
      tap((result: unknown) => {
        void (async () => {
          try {
            const userId = user?.id || user?.sub;

            let auditableId: string | undefined;
            if (result && typeof result === 'object' && 'id' in result) {
              auditableId = (result as { id: string }).id;
            } else if (request.params && 'id' in request.params) {
              auditableId = request.params.id;
            }

            const auditData = {
              user_id: userId,
              action: auditOptions.action,
              auditable_type: auditOptions.resource,
              auditable_id: auditableId,
              ip_address: ip,
            };

            await this.auditLogsService.create(auditData);
          } catch {
            // audit log failed silently
          }
        })();
      }),
    );
  }
}
