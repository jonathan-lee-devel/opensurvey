import { ConflictException, Injectable } from '@nestjs/common';
import { count, desc } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { isUniqueViolation } from '../../../../database/pg-errors.js';
import { users } from '../../../../database/schema/index.js';
import type {
  CreateUserDto,
  ListUsersQuery,
} from '../../controllers/admin-users/admin-users.schema.js';

@Injectable()
export class AdminUsersService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Creates a user. Emails are stored lowercased so the unique constraint
   * treats `Ada@Example.com` and `ada@example.com` as the same address.
   *
   * @throws ConflictException when a user with the email already exists.
   */
  async create(dto: CreateUserDto) {
    const email = dto.email.toLowerCase();
    try {
      const [user] = await this.db
        .insert(users)
        .values({ email, displayName: dto.displayName ?? null })
        .returning();
      return user;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A user with email "${email}" exists`);
      }
      throw error;
    }
  }

  /** A page of users, newest first, plus the total for the paging controls. */
  async list({ limit, offset }: ListUsersQuery) {
    const [items, [{ total }]] = await Promise.all([
      this.db.query.users.findMany({
        orderBy: desc(users.createdAt),
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(users),
    ]);
    return { items, total };
  }
}
