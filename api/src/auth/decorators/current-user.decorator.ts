import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

import type { AuthenticatedRequest, AuthenticatedUser } from '../auth.types.js';

/**
 * Parameter decorator handing a handler the verified caller: its `subject`
 * and the token's `claims`. On an `@IsPublic()` route it is `undefined`.
 *
 * @example
 * create(@Body({ schema }) dto: Dto, @CurrentUser() user: AuthenticatedUser) {}
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
