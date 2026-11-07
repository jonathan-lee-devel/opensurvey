import { Test, TestingModule } from '@nestjs/testing';

import { PublicPollsController } from './public-polls.controller.js';

describe('PublicPollsController', () => {
  let controller: PublicPollsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicPollsController],
    }).compile();

    controller = module.get<PublicPollsController>(PublicPollsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
