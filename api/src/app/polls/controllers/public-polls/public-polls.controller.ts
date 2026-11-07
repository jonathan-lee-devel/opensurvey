import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { and, asc, eq } from 'drizzle-orm';

import type { Database } from '../../../../database/database.types.js';
import { InjectDrizzle } from '../../../../database/database.types.js';
import { pollOptions, polls } from '../../../../database/schema/index.js';
import { pollSlugSchema, publicPollSchema } from './public-polls.schema.js';

@ApiTags('polls')
@Controller('public/polls')
export class PublicPollsController {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  /**
   * Get a published poll by its slug
   *
   * @remarks Returns the poll and its options in display order. Drafts and
   * closed polls are not visible here.
   */
  @Get(':slug')
  @ApiOkResponse({ standardSchema: publicPollSchema })
  @ApiNotFoundResponse({ description: 'No published poll has this slug.' })
  async findBySlug(@Param('slug', { schema: pollSlugSchema }) slug: string) {
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
