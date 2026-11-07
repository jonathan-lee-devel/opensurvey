import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { pollOptions, polls } from '../../../../database/schema/index.js';

/** Read access to polls for anyone with the link: only published ones. */
@Injectable()
export class PublicPollsService {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * The published poll with this slug and its options in display order. Only
   * the columns the public response schema lists are selected.
   *
   * @throws NotFoundException when no poll has the slug or it is not published.
   */
  async findBySlug(slug: string) {
    const poll = await this.db.query.polls.findFirst({
      columns: {
        id: true,
        question: true,
        slug: true,
        status: true,
        closesAt: true,
      },
      where: and(eq(polls.slug, slug), eq(polls.status, 'published')),
      with: {
        options: {
          columns: { id: true, label: true, position: true },
          orderBy: asc(pollOptions.position),
        },
      },
    });
    if (!poll) throw new NotFoundException(`No published poll "${slug}"`);
    return poll;
  }
}
