import { Test, TestingModule } from '@nestjs/testing';

import { AdminUsersService } from '../../services/admin-users/admin-users.service.js';
import { AdminUsersController } from './admin-users.controller.js';

describe('AdminUsersController', () => {
  let controller: AdminUsersController;
  const create = vi.fn();

  beforeEach(async () => {
    create.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [{ provide: AdminUsersService, useValue: { create } }],
    }).compile();

    controller = module.get<AdminUsersController>(AdminUsersController);
  });

  it('delegates to the service and returns its result', async () => {
    const dto = { email: 'ada@example.com' };
    const user = { id: '1', ...dto };
    create.mockResolvedValue(user);
    await expect(controller.create(dto)).resolves.toBe(user);
    expect(create).toHaveBeenCalledWith(dto);
  });
});
