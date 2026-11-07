import { CacheInterceptor } from '@nestjs/cache-manager';
import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { PublicPollsService } from '../../services/public-polls/public-polls.service.js';
import { pollSlugSchema, publicPollSchema } from './public-polls.schema.js';

@ApiTags('polls')
@Controller('public/polls')
@UseInterceptors(CacheInterceptor)
export class PublicPollsController {
  constructor(private readonly publicPolls: PublicPollsService) {}

  /**
   * Get a published poll by its slug
   *
   * @remarks Returns the poll and its options in display order. Drafts and
   * closed polls are not visible here.
   */
  @Get(':slug')
  @ApiOkResponse({ standardSchema: publicPollSchema })
  @ApiNotFoundResponse({ description: 'No published poll has this slug.' })
  findBySlug(@Param('slug', { schema: pollSlugSchema }) slug: string) {
    return this.publicPolls.findBySlug(slug);
  }
}
