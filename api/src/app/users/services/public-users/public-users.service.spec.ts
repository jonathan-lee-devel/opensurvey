import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';

import { PublicUsersService } from './public-users.service.js';

describe('PublicUsersService', () => {
  let service: PublicUsersService;
  const findFirst = vi.fn();

  beforeEach(async () => {
    findFirst.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicUsersService,
        {
          provide: getDrizzleToken(),
          useValue: { query: { users: { findFirst } } },
        },
      ],
    }).compile();

    service = module.get<PublicUsersService>(PublicUsersService);
  });

  it('returns the user the database finds', async () => {
    const user = { id: '1', displayName: 'Ada' };
    findFirst.mockResolvedValue(user);
    await expect(service.findOne('1')).resolves.toBe(user);
    expect(findFirst).toHaveBeenCalledOnce();
  });

  it('throws NotFoundException when no user has the id', async () => {
    findFirst.mockResolvedValue(undefined);
    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
