import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AdminUsersService } from '../../services/admin-users/admin-users.service.js';
import type { CreateUserDto } from './admin-users.schema.js';
import { adminUserSchema, createUserSchema } from './admin-users.schema.js';

@ApiTags('users')
@Controller('admin/users')
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
}
