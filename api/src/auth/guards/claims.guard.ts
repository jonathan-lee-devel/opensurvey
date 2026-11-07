import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { REQUIRED_CLAIMS_KEY } from '../auth.constants.js';
import type { AuthenticatedRequest } from '../auth.types.js';
import { hasClaim } from '../claims.js';

/**
 * Global guard (APP_GUARD in `AuthModule`, after `AuthGuard`): enforces
 * `@HasClaim()`. Routes without the decorator pass. On a decorated route the
 * caller `AuthGuard` attached must hold every claim listed on the handler and
 * on the controller, or the answer is 403. A decorated route that is also
 * `@IsPublic()` has no caller to check, so it answers 401 for everyone: the
 * two decorators do not belong together.
 */
@Injectable()
export class ClaimsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndMerge<string[]>(
      REQUIRED_CLAIMS_KEY,
      [context.getClass(), context.getHandler()],
    );
    if (required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (user === undefined) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const missing = required.filter((claim) => !hasClaim(user.claims, claim));
    if (missing.length > 0) {
      throw new ForbiddenException(
        `Missing required claim${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      );
    }
    return true;
  }
}
