import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { SURVEY_ADMIN_CLAIM } from '../../../../auth/auth.constants.js';
import { HasClaim } from '../../../../auth/decorators/has-claim.decorator.js';
import { AdminPollsService } from '../../services/admin-polls/admin-polls.service.js';
import type {
  CreatePollDto,
  ListPollsQuery,
  UpdatePollDto,
} from './admin-polls.schema.js';
import {
  adminPollListSchema,
  adminPollSchema,
  createPollSchema,
  listPollsQuerySchema,
  pollIdSchema,
  updatePollSchema,
} from './admin-polls.schema.js';

@ApiTags('polls')
@Controller('admin/polls')
// Needs a Bearer token (AuthGuard, the default) holding the admin claim.
@HasClaim(SURVEY_ADMIN_CLAIM)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token.' })
@ApiForbiddenResponse({
  description: `The token does not hold the ${SURVEY_ADMIN_CLAIM} claim.`,
})
export class AdminPollsController {
  constructor(private readonly adminPolls: AdminPollsService) {}

  /**
   * Create a poll with its options
   *
   * @remarks Options keep the order given. The poll starts as a draft unless
   * a status is supplied.
   */
  @Post()
  @ApiCreatedResponse({ standardSchema: adminPollSchema })
  @ApiConflictResponse({ description: 'A poll with this slug exists.' })
  @ApiUnprocessableEntityResponse({ description: 'The owner does not exist.' })
  create(@Body({ schema: createPollSchema }) dto: CreatePollDto) {
    return this.adminPolls.create(dto);
  }

  /**
   * List polls
   *
   * @remarks Newest first, without their options. Page with `limit` (1 to
   * 200, default 50) and `offset`; filter with `status`. `total` counts every
   * poll matching the filter.
   */
  @Get()
  @ApiOkResponse({ standardSchema: adminPollListSchema })
  list(@Query({ schema: listPollsQuerySchema }) query: ListPollsQuery) {
    return this.adminPolls.list(query);
  }

  /**
   * Get a poll by its id
   *
   * @remarks Returns the poll with its owner and its options in display
   * order. Drafts and closed polls are returned too.
   */
  @Get(':id')
  @ApiOkResponse({ standardSchema: adminPollSchema })
  @ApiNotFoundResponse({ description: 'No poll has this id.' })
  findById(@Param('id', { schema: pollIdSchema }) id: string) {
    return this.adminPolls.findById(id);
  }

  /**
   * Update a poll's question, slug, status or closing time
   *
   * @remarks Send only the fields to change. Publishing makes the poll
   * readable at its public link; closing or renaming the slug takes effect
   * there at once, the cached public response is dropped. Options cannot be
   * changed once a poll exists.
   */
  @Patch(':id')
  @ApiOkResponse({ standardSchema: adminPollSchema })
  @ApiNotFoundResponse({ description: 'No poll has this id.' })
  @ApiConflictResponse({ description: 'A poll with this slug exists.' })
  update(
    @Param('id', { schema: pollIdSchema }) id: string,
    @Body({ schema: updatePollSchema }) dto: UpdatePollDto,
  ) {
    return this.adminPolls.update(id, dto);
  }

  /**
   * Delete a poll
   *
   * @remarks Removes the poll with its options and votes, and drops its
   * cached public response.
   */
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'The poll is gone.' })
  @ApiNotFoundResponse({ description: 'No poll has this id.' })
  async remove(@Param('id', { schema: pollIdSchema }) id: string) {
    await this.adminPolls.remove(id);
  }
}
