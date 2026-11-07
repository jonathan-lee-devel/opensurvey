import {
  ConflictException,
  NotFoundException,
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

  describe('list', () => {
    const items = [{ id: 'p1' }, { id: 'p2' }];
    let where: Stub<unknown[]>;

    beforeEach(() => {
      where = stub().mockResolvedValue([{ total: 4 }]);
      db.query.polls.findMany.mockResolvedValue(items as never);
      db.select.mockReturnValue({ from: () => ({ where }) } as never);
    });

    it('returns the page the database finds and the total count', async () => {
      await expect(service.list({ limit: 10, offset: 20 })).resolves.toEqual({
        items,
        total: 4,
      });
      expect(db.query.polls.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20, where: undefined }),
      );
      expect(where).toHaveBeenCalledWith(undefined);
    });

    it('filters both the page and the count by status when given', async () => {
      await service.list({ limit: 50, offset: 0, status: 'closed' });
      const { where: pageWhere } = db.query.polls.findMany.mock.calls[0][0]!;
      expect(pageWhere).toBeDefined();
      expect(where).toHaveBeenCalledWith(pageWhere);
    });
  });

  describe('findById', () => {
    const pollId = '22222222-2222-4222-8222-222222222222';

    it('returns the poll the database finds, options included', async () => {
      const poll = { id: pollId, question: 'Lunch?', options: [] };
      db.query.polls.findFirst.mockResolvedValue(poll as never);

      await expect(service.findById(pollId)).resolves.toBe(poll);
      expect(db.query.polls.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          with: {
            options: expect.objectContaining({ orderBy: expect.anything() }),
          },
        }),
      );
    });

    it('throws NotFoundException when no poll has the id', async () => {
      db.query.polls.findFirst.mockResolvedValue(undefined);
      await expect(service.findById(pollId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
