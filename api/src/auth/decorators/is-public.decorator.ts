import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_KEY } from '../auth.constants.js';

/**
 * Lets anonymous callers reach a handler, or every handler of a controller.
 * Every other route needs a valid JWT Bearer token (`AuthGuard`). On a public
 * route no token is read, so `@CurrentUser()` is `undefined` there.
 *
 * @example
 * @IsPublic()
 * @Controller('public/polls')
 * export class PublicPollsController {}
 */
export const IsPublic = () => SetMetadata(IS_PUBLIC_KEY, true);
