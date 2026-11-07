import { Module } from '@nestjs/common';

import { PublicPollsController } from './controllers/public-polls/public-polls.controller.js';
import { PublicPollsService } from './services/public-polls/public-polls.service.js';

@Module({
  controllers: [PublicPollsController],
  providers: [PublicPollsService],
})
export class PollsModule {}
