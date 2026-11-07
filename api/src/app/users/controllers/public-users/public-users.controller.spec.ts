import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';

import { PublicUsersController } from './public-users.controller.js';

describe('PublicUsersController', () => {
  let controller: PublicUsersController;
  const findFirst = vi.fn();

  beforeEach(async () => {
    findFirst.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicUsersController],
      providers: [
        {
          provide: getDrizzleToken(),
          useValue: { query: { users: { findFirst } } },
        },
      ],
    }).compile();

    controller = module.get<PublicUsersController>(PublicUsersController);
  });

  it('returns the user the database finds', async () => {
    const user = { id: '1', displayName: 'Ada' };
    findFirst.mockResolvedValue(user);
    await expect(controller.findOne('1')).resolves.toBe(user);
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('answers 404 when no user has the id', async () => {
    findFirst.mockResolvedValue(undefined);
    await expect(controller.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
