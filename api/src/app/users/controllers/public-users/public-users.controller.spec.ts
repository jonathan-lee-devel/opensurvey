import { Test, TestingModule } from '@nestjs/testing';

import { PublicUsersService } from '../../services/public-users/public-users.service.js';
import { PublicUsersController } from './public-users.controller.js';

describe('PublicUsersController', () => {
  let controller: PublicUsersController;
  const findOne = vi.fn();

  beforeEach(async () => {
    findOne.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicUsersController],
      providers: [{ provide: PublicUsersService, useValue: { findOne } }],
    }).compile();

    controller = module.get<PublicUsersController>(PublicUsersController);
  });

  it('delegates to the service and returns its result', async () => {
    const user = { id: '1', displayName: 'Ada' };
    findOne.mockResolvedValue(user);
    await expect(controller.findOne('1')).resolves.toBe(user);
    expect(findOne).toHaveBeenCalledWith('1');
  });
});
