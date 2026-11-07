import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { IsPublic } from '../../../../auth/decorators/is-public.decorator.js';
import { PublicUsersService } from '../../services/public-users/public-users.service.js';
import { publicUserSchema, userIdSchema } from './public-users.schema.js';

@ApiTags('users')
@Controller('public/users')
// Anonymous callers are welcome here; everything else needs a Bearer token.
@IsPublic()
// Serves repeat GETs from the Redis cache (CacheModule in app.module.ts) for
// CACHE_TTL_MS; only successful responses are stored, never a 404.
@UseInterceptors(CacheInterceptor)
export class PublicUsersController {
  constructor(private readonly publicUsers: PublicUsersService) {}

  /**
   * Get a user's public profile
   *
   * @remarks Only the display name and join date are public; the email
   * address is not.
   */
  @Get(':id')
  @ApiOkResponse({ standardSchema: publicUserSchema })
  @ApiNotFoundResponse({ description: 'No user has this id.' })
  findOne(@Param('id', { schema: userIdSchema }) id: string) {
    return this.publicUsers.findOne(id);
  }
}
