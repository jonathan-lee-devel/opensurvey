import { ConflictException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test, TestingModule } from '@nestjs/testing';

import { AdminUsersService } from './admin-users.service.js';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  const returning = vi.fn();
  const values = vi.fn(() => ({ returning }));
  const insert = vi.fn(() => ({ values }));

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminUsersService,
        { provide: getDrizzleToken(), useValue: { insert } },
      ],
    }).compile();

    service = module.get<AdminUsersService>(AdminUsersService);
  });

  it('inserts the user with a lowercased email and returns the row', async () => {
    const row = { id: '1', email: 'ada@example.com', displayName: 'Ada' };
    returning.mockResolvedValue([row]);
    await expect(
      service.create({ email: 'Ada@Example.com', displayName: 'Ada' }),
    ).resolves.toBe(row);
    expect(values).toHaveBeenCalledWith({
      email: 'ada@example.com',
      displayName: 'Ada',
    });
  });

  it('maps a unique violation to ConflictException', async () => {
    returning.mockRejectedValue(
      new Error('Failed query', { cause: { code: '23505' } }),
    );
    await expect(
      service.create({ email: 'ada@example.com' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows other errors', async () => {
    const boom = new Error('connection lost');
    returning.mockRejectedValue(boom);
    await expect(service.create({ email: 'ada@example.com' })).rejects.toBe(
      boom,
    );
  });
});
