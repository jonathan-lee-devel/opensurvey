import { ConflictException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { stub } from '@suites/doubles.vitest';
import type { Stub } from '@suites/unit';
import { TestBed } from '@suites/unit';

import type { Database } from '../../../../database/database.types.js';
import { AdminUsersService } from './admin-users.service.js';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  // db.insert(...).values(...).returning() resolves to the inserted rows.
  let values: Stub<unknown[]>;
  let returning: Stub<unknown[]>;

  beforeEach(async () => {
    returning = stub();
    values = stub().mockReturnValue({ returning });

    const { unit } = await TestBed.solitary(AdminUsersService)
      .mock<Database>(getDrizzleToken())
      .impl((fn) => ({ insert: fn().mockReturnValue({ values }) }))
      .compile();
    service = unit;
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
