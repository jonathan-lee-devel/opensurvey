import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import {
  isForeignKeyViolation,
  isUniqueViolation,
} from '../../../../database/pg-errors.js';
import { pollOptions, polls } from '../../../../database/schema/index.js';
import type { CreatePollDto } from '../../controllers/admin-polls/admin-polls.schema.js';

@Injectable()
export class AdminPollsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Creates a poll and its options in one transaction. Options take their
   * position from their order in the request.
   *
   * @throws ConflictException when a poll with the slug already exists.
   * @throws UnprocessableEntityException when the owner does not exist.
   */
  async create(dto: CreatePollDto) {
    try {
      return await this.db.transaction(async (tx) => {
        const [poll] = await tx
          .insert(polls)
          .values({
            ownerId: dto.ownerId,
            question: dto.question,
            slug: dto.slug,
            status: dto.status,
            closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
          })
          .returning();
        const options = await tx
          .insert(pollOptions)
          .values(
            dto.options.map((label, position) => ({
              pollId: poll.id,
              label,
              position,
            })),
          )
          .returning({
            id: pollOptions.id,
            label: pollOptions.label,
            position: pollOptions.position,
          });
        options.sort((a, b) => a.position - b.position);
        return { ...poll, options };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A poll with slug "${dto.slug}" exists`);
      }
      if (isForeignKeyViolation(error)) {
        throw new UnprocessableEntityException(
          `No user "${dto.ownerId}" to own the poll`,
        );
      }
      throw error;
    }
  }
}
