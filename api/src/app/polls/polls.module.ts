import { Module } from '@nestjs/common';

import { PublicPollsController } from './controllers/public-polls/public-polls.controller.js';

@Module({
  controllers: [PublicPollsController]
})
export class PollsModule {}
