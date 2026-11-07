import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { users } from '../../../../database/schema/index.js';

/** The public face of users: display name and join date, never the email. */
@Injectable()
export class PublicUsersService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * The public profile of the user with this id.
   *
   * @throws NotFoundException when no user has the id.
   */
  async findOne(id: string) {
    const user = await this.db.query.users.findFirst({
      columns: { id: true, displayName: true, createdAt: true },
      where: eq(users.id, id),
    });
    if (!user) throw new NotFoundException(`No user "${id}"`);
    return user;
  }
}
