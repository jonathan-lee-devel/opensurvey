import { ConflictException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { stub } from '@suites/doubles.vitest';
import type { Mocked, Stub } from '@suites/unit';
import { TestBed } from '@suites/unit';

import type { Database } from '../../../../database/database.types.js';
import { AdminUsersService } from './admin-users.service.js';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  let db: Mocked<Database>;
  // db.insert(...).values(...).returning() resolves to the inserted rows.
  let values: Stub<unknown[]>;
  let returning: Stub<unknown[]>;

  beforeEach(async () => {
    returning = stub();
    values = stub().mockReturnValue({ returning });

    const { unit, unitRef } = await TestBed.solitary(AdminUsersService)
      .mock<Database>(getDrizzleToken())
      .impl((fn) => ({ insert: fn().mockReturnValue({ values }) }))
      .compile();
    service = unit;
    db = unitRef.get<Database>(getDrizzleToken());
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

  it('lists a page of users newest first with the total count', async () => {
    const items = [{ id: '2' }, { id: '1' }];
    db.query.users.findMany.mockResolvedValue(items as never);
    db.select.mockReturnValue({
      from: () => Promise.resolve([{ total: 12 }]),
    } as never);

    await expect(service.list({ limit: 10, offset: 20 })).resolves.toEqual({
      items,
      total: 12,
    });
    expect(db.query.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, offset: 20 }),
    );
  });
});
