import { Test, TestingModule } from '@nestjs/testing';

import { PublicUsersController } from './public-users.controller.js';

describe('PublicUsersController', () => {
  let controller: PublicUsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicUsersController],
    }).compile();

    controller = module.get<PublicUsersController>(PublicUsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
