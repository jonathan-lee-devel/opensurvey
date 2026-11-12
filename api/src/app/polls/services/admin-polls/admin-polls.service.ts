import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { asc, count, desc, eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { isForeignKeyViolation, isUniqueViolation, } from '../../../../database/pg-errors.js';
import { pollOptions, polls } from '../../../../database/schema/index.js';
import type {
  CreatePollDto,
  ListPollsQuery,
  UpdatePollDto,
} from '../../controllers/admin-polls/admin-polls.schema.js';

/** The cached public response for a slug, as `CacheInterceptor` keys it. */
const publicPollUrl = (slug: string) => `/public/polls/${slug}`;

@Injectable()
export class AdminPollsService {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

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

  /**
   * A page of polls, newest first, without their options, plus the total for
   * the paging controls. Every status is listed unless one is asked for.
   */
  async list({ limit, offset, status }: ListPollsQuery) {
    const where = status ? eq(polls.status, status) : undefined;
    const [items, [{ total }]] = await Promise.all([
      this.db.query.polls.findMany({
        where,
        orderBy: desc(polls.createdAt),
        limit,
        offset,
      }),
      this.db.select({ total: count() }).from(polls).where(where),
    ]);
    return { items, total };
  }

  /**
   * The poll with this id and its options in display order, whatever its
   * status: administrators see drafts and closed polls too.
   *
   * @throws NotFoundException when no poll has the id.
   */
  async findById(id: string) {
    const poll = await this.db.query.polls.findFirst({
      where: eq(polls.id, id),
      with: {
        options: {
          columns: { id: true, label: true, position: true },
          orderBy: asc(pollOptions.position),
        },
      },
    });
    if (!poll) throw new NotFoundException(`No poll "${id}"`);
    return poll;
  }

  /**
   * Changes the poll's own fields and returns it as `findById()` does. The
   * public response cached under the old slug (and the new one, if renamed)
   * is dropped, so the public link follows the change at once.
   *
   * @throws NotFoundException when no poll has the id.
   * @throws ConflictException when another poll has the new slug.
   */
  async update(id: string, dto: UpdatePollDto) {
    const existing = await this.db.query.polls.findFirst({
      columns: { id: true, slug: true },
      where: eq(polls.id, id),
    });
    if (!existing) throw new NotFoundException(`No poll "${id}"`);

    const { closesAt, ...fields } = dto;
    const changes = {
      ...fields,
      ...(closesAt !== undefined && {
        closesAt: closesAt === null ? null : new Date(closesAt),
      }),
    };
    let updated: { slug: string };
    try {
      [updated] = await this.db
        .update(polls)
        .set(changes)
        .where(eq(polls.id, id))
        .returning({ slug: polls.slug });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(`A poll with slug "${dto.slug}" exists`);
      }
      throw error;
    }
    await this.invalidatePublic(existing.slug, updated.slug);
    return this.findById(id);
  }

  /**
   * Deletes the poll; its options and votes cascade, and the public response
   * cached under its slug is dropped.
   *
   * @throws NotFoundException when no poll has the id.
   */
  async remove(id: string): Promise<void> {
    const [deleted] = await this.db
      .delete(polls)
      .where(eq(polls.id, id))
      .returning({ slug: polls.slug });
    if (!deleted) throw new NotFoundException(`No poll "${id}"`);
    await this.invalidatePublic(deleted.slug);
  }

  private async invalidatePublic(...slugs: string[]): Promise<void> {
    const urls = [...new Set(slugs)].map(publicPollUrl);
    await Promise.all(urls.map((url) => this.cache.del(url)));
  }
}
