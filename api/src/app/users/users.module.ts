import { Module } from '@nestjs/common';

import { PublicUsersController } from './controllers/public-users/public-users.controller.js';
import { PublicUsersService } from './services/public-users/public-users.service.js';

@Module({
  controllers: [PublicUsersController],
  providers: [PublicUsersService],
})
export class UsersModule {}
