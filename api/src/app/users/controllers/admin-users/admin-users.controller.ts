import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { SURVEY_ADMIN_CLAIM } from '../../../../auth/auth.constants.js';
import { HasClaim } from '../../../../auth/decorators/has-claim.decorator.js';
import { AdminUsersService } from '../../services/admin-users/admin-users.service.js';
import type { CreateUserDto, ListUsersQuery } from './admin-users.schema.js';
import {
  adminUserListSchema,
  adminUserSchema,
  createUserSchema,
  listUsersQuerySchema,
} from './admin-users.schema.js';

@ApiTags('users')
@Controller('admin/users')
// Needs a Bearer token (AuthGuard, the default) holding the admin claim.
@HasClaim(SURVEY_ADMIN_CLAIM)
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid Bearer token.' })
@ApiForbiddenResponse({
  description: `The token does not hold the ${SURVEY_ADMIN_CLAIM} claim.`,
})
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  /**
   * Create a user
   *
   * @remarks The email is stored lowercased and must be unique.
   */
  @Post()
  @ApiCreatedResponse({ standardSchema: adminUserSchema })
  @ApiConflictResponse({ description: 'A user with this email exists.' })
  create(@Body({ schema: createUserSchema }) dto: CreateUserDto) {
    return this.adminUsers.create(dto);
  }

  /**
   * List users
   *
   * @remarks Newest first. Page with `limit` (1 to 200, default 50) and
   * `offset`; `total` counts every user.
   */
  @Get()
  @ApiOkResponse({ standardSchema: adminUserListSchema })
  list(@Query({ schema: listUsersQuerySchema }) query: ListUsersQuery) {
    return this.adminUsers.list(query);
  }
}
