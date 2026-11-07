import { TestBed } from '@suites/unit';

import { AdminUsersService } from '../../services/admin-users/admin-users.service.js';
import { AdminUsersController } from './admin-users.controller.js';

describe('AdminUsersController', () => {
  it('delegates to the service and returns its result', async () => {
    const dto = { email: 'ada@example.com' };
    const user = { id: '1', ...dto };
    const { unit, unitRef } = await TestBed.solitary(AdminUsersController)
      .mock(AdminUsersService)
      .impl((stub) => ({ create: stub().mockResolvedValue(user) }))
      .compile();

    await expect(unit.create(dto)).resolves.toBe(user);
    expect(unitRef.get(AdminUsersService).create).toHaveBeenCalledWith(dto);
  });
});
