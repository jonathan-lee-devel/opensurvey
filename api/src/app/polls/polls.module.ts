import { Module } from '@nestjs/common';

import { AdminPollsController } from './controllers/admin-polls/admin-polls.controller.js';
import { PublicPollsController } from './controllers/public-polls/public-polls.controller.js';
import { AdminPollsService } from './services/admin-polls/admin-polls.service.js';
import { PublicPollsService } from './services/public-polls/public-polls.service.js';

@Module({
  controllers: [PublicPollsController, AdminPollsController],
  providers: [PublicPollsService, AdminPollsService],
})
export class PollsModule {}
