import { Controller, Get, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { PublicUsersService } from '../../services/public-users/public-users.service.js';
import { publicUserSchema, userIdSchema } from './public-users.schema.js';

@ApiTags('users')
@Controller('public/users')
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
