import { NotFoundException } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import type { Mocked } from '@suites/unit';
import { TestBed } from '@suites/unit';

import type { Database } from '../../../../database/database.types.js';
import { PublicPollsService } from './public-polls.service.js';

describe('PublicPollsService', () => {
  let service: PublicPollsService;
  let db: Mocked<Database>;

  beforeEach(async () => {
    const { unit, unitRef } =
      await TestBed.solitary(PublicPollsService).compile();
    service = unit;
    db = unitRef.get<Database>(getDrizzleToken());
  });

  it('returns the poll the database finds', async () => {
    const poll = { id: '1', slug: 'lunch', options: [] };
    db.query.polls.findFirst.mockResolvedValue(poll as never);

    await expect(service.findBySlug('lunch')).resolves.toBe(poll);
    expect(db.query.polls.findFirst).toHaveBeenCalledOnce();
  });

  it('throws NotFoundException when no published poll has the slug', async () => {
    db.query.polls.findFirst.mockResolvedValue(undefined);

    await expect(service.findBySlug('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
