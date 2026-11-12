import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
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
  let cache: Mocked<Cache>;
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
    cache = unitRef.get<Cache>(CACHE_MANAGER);
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

  describe('update', () => {
    const pollId = '22222222-2222-4222-8222-222222222222';
    let set: Stub<unknown[]>;
    let returning: Stub<unknown[]>;

    beforeEach(() => {
      returning = stub();
      set = stub().mockReturnValue({ where: () => ({ returning }) });
      (db.update as unknown as Stub<unknown[]>).mockReturnValue({ set });
      db.query.polls.findFirst
        .mockResolvedValueOnce({ id: pollId, slug: 'old' } as never)
        .mockResolvedValueOnce({
          id: pollId,
          slug: 'new',
          options: [],
        } as never);
    });

    it('updates the row, drops both cached public responses and returns the poll', async () => {
      returning.mockResolvedValue([{ slug: 'new' }]);

      const result = await service.update(pollId, {
        slug: 'new',
        closesAt: '2030-01-01T12:00:00Z',
      });

      expect(result).toMatchObject({ id: pollId, slug: 'new' });
      expect(set).toHaveBeenCalledWith({
        slug: 'new',
        closesAt: new Date('2030-01-01T12:00:00Z'),
      });
      expect(cache.del).toHaveBeenCalledWith('/public/polls/old');
      expect(cache.del).toHaveBeenCalledWith('/public/polls/new');
    });

    it('clears the closing time when given null and leaves it alone when absent', async () => {
      returning.mockResolvedValue([{ slug: 'old' }]);
      await service.update(pollId, { closesAt: null, status: 'closed' });
      expect(set).toHaveBeenCalledWith({ closesAt: null, status: 'closed' });

      db.query.polls.findFirst
        .mockResolvedValueOnce({ id: pollId, slug: 'old' } as never)
        .mockResolvedValueOnce({
          id: pollId,
          slug: 'old',
          options: [],
        } as never);
      await service.update(pollId, { question: 'Dinner?' });
      expect(set).toHaveBeenLastCalledWith({ question: 'Dinner?' });
    });

    it('maps a unique violation on the slug to ConflictException', async () => {
      returning.mockRejectedValue(
        new Error('Failed query', { cause: { code: '23505' } }),
      );
      await expect(
        service.update(pollId, { slug: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no poll has the id', async () => {
      db.query.polls.findFirst.mockReset().mockResolvedValue(undefined);
      await expect(
        service.update(pollId, { status: 'closed' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const pollId = '22222222-2222-4222-8222-222222222222';
    let returning: Stub<unknown[]>;

    beforeEach(() => {
      returning = stub();
      // Cast past Drizzle's delete overloads, which the deep mock type cannot resolve.
      (db.delete as unknown as Stub<unknown[]>).mockReturnValue({
        where: () => ({ returning }),
      });
    });

    it('deletes the row and drops its cached public response', async () => {
      returning.mockResolvedValue([{ slug: 'gone' }]);
      await expect(service.remove(pollId)).resolves.toBeUndefined();
      expect(cache.del).toHaveBeenCalledWith('/public/polls/gone');
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      returning.mockResolvedValue([]);
      await expect(service.remove(pollId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(cache.del).not.toHaveBeenCalled();
    });
  });
});
