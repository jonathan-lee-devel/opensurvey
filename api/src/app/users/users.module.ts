import { Module } from '@nestjs/common';

import { AdminUsersController } from './controllers/admin-users/admin-users.controller.js';
import { PublicUsersController } from './controllers/public-users/public-users.controller.js';
import { AdminUsersService } from './services/admin-users/admin-users.service.js';
import { PublicUsersService } from './services/public-users/public-users.service.js';

@Module({
  controllers: [PublicUsersController, AdminUsersController],
  providers: [PublicUsersService, AdminUsersService],
})
export class UsersModule {}
