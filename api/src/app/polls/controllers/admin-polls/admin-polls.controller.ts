import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { AdminPollsService } from '../../services/admin-polls/admin-polls.service.js';
import type { CreatePollDto } from './admin-polls.schema.js';
import { adminPollSchema, createPollSchema } from './admin-polls.schema.js';

@ApiTags('polls')
@Controller('admin/polls')
// Needs a Bearer token (AuthGuard, the default); documented for Swagger UI.
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token.' })
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
}
