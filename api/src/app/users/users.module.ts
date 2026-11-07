import { Module } from '@nestjs/common';

import { PublicUsersController } from './controllers/public-users/public-users.controller.js';

@Module({
  controllers: [PublicUsersController]
})
export class UsersModule {}
