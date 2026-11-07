import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { mock, stub } from '@suites/doubles.vitest';
import type { Mocked, Stub } from '@suites/unit';
import { TestBed } from '@suites/unit';

import type { Database } from '../../../../database/database.types.js';
import { CreatePollDto } from '../../controllers/admin-polls/admin-polls.schema.js';
import { AdminPollsService } from './admin-polls.service.js';

const dto: CreatePollDto = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  question: 'Lunch?',
  slug: 'lunch',
  status: 'draft',
  closesAt: '2026-12-01T12:00:00Z',
  options: ['Pizza', 'Tacos'],
};

describe('AdminPollsService', () => {
  let service: AdminPollsService;
  let db: Mocked<Database>;
  // Each tx.insert(...).values(...).returning() call pops the next result.
  let values: Stub<unknown[]>;
  let returning: Stub<unknown[]>;

  beforeEach(async () => {
    returning = stub();
    values = stub().mockReturnValue({ returning });
    const tx = mock<Database>();
    tx.insert.mockReturnValue({ values } as never);

    const { unit, unitRef } = await TestBed.solitary(AdminPollsService)
      .mock<Database>(getDrizzleToken())
      .impl((fn) => ({
        transaction: fn().mockImplementation((run) => run(tx)),
      }))
      .compile();
    service = unit;
    db = unitRef.get<Database>(getDrizzleToken());
  });

  it('inserts the poll then its options, positioned by request order', async () => {
    const poll = { id: 'p1', slug: 'lunch' };
    returning.mockResolvedValueOnce([poll]).mockResolvedValueOnce([
      { id: 'o2', label: 'Tacos', position: 1 },
      { id: 'o1', label: 'Pizza', position: 0 },
    ]);

    const result = await service.create(dto);

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(values).toHaveBeenNthCalledWith(1, {
      ownerId: dto.ownerId,
      question: 'Lunch?',
      slug: 'lunch',
      status: 'draft',
      closesAt: new Date('2026-12-01T12:00:00Z'),
    });
    expect(values).toHaveBeenNthCalledWith(2, [
      { pollId: 'p1', label: 'Pizza', position: 0 },
      { pollId: 'p1', label: 'Tacos', position: 1 },
    ]);
    expect(result.options.map((o) => o.label)).toEqual(['Pizza', 'Tacos']);
  });

  it('maps a unique violation to ConflictException', async () => {
    returning.mockRejectedValue(
      new Error('Failed query', { cause: { code: '23505' } }),
    );
    await expect(service.create(dto)).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps a foreign key violation to UnprocessableEntityException', async () => {
    returning.mockRejectedValue(
      new Error('Failed query', { cause: { code: '23503' } }),
    );
    await expect(service.create(dto)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});
