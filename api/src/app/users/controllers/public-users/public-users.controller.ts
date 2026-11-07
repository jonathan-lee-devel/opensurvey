import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { users } from '../../../../database/schema/index.js';
import { publicUserSchema, userIdSchema } from './public-users.schema.js';

@ApiTags('users')
@Controller('public/users')
export class PublicUsersController {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Get a user's public profile
   *
   * @remarks Only the display name and join date are public; the email
   * address is not.
   */
  @Get(':id')
  @ApiOkResponse({ standardSchema: publicUserSchema })
  @ApiNotFoundResponse({ description: 'No user has this id.' })
  async findOne(@Param('id', { schema: userIdSchema }) id: string) {
    const user = await this.db.query.users.findFirst({
      columns: { id: true, displayName: true, createdAt: true },
      where: eq(users.id, id),
    });
    if (!user) throw new NotFoundException(`No user "${id}"`);
    return user;
  }
}
