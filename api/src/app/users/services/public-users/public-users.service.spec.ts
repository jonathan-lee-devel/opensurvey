import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import type { Mocked } from '@suites/unit';
import { TestBed } from '@suites/unit';

import type { Database } from '../../../../database/database.types.js';
import { PublicUsersService } from './public-users.service.js';

describe('PublicUsersService', () => {
  let service: PublicUsersService;
  let db: Mocked<Database>;

  beforeEach(async () => {
    const { unit, unitRef } =
      await TestBed.solitary(PublicUsersService).compile();
    service = unit;
    db = unitRef.get<Database>(getDrizzleToken());
  });

  it('returns the user the database finds', async () => {
    const user = { id: '1', displayName: 'Ada' };
    db.query.users.findFirst.mockResolvedValue(user as never);

    await expect(service.findOne('1')).resolves.toBe(user);
    expect(db.query.users.findFirst).toHaveBeenCalledOnce();
  });

  it('throws NotFoundException when no user has the id', async () => {
    db.query.users.findFirst.mockResolvedValue(undefined);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
