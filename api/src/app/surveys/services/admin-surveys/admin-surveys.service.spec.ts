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
import { CreateSurveyDto } from '../../controllers/admin-surveys/admin-surveys.schema.js';
import { AdminSurveysService } from './admin-surveys.service.js';

const dto: CreateSurveyDto = {
  ownerId: '11111111-1111-4111-8111-111111111111',
  title: 'Feedback',
  description: null,
  slug: 'feedback',
  status: 'draft',
  questions: [
    { type: 'short_text', prompt: 'Name?', required: true },
    {
      type: 'single_choice',
      prompt: 'Rating?',
      required: false,
      options: ['Good', 'Bad'],
    },
  ],
};

describe('AdminSurveysService', () => {
  let service: AdminSurveysService;
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

    const { unit, unitRef } = await TestBed.solitary(AdminSurveysService)
      .mock<Database>(getDrizzleToken())
      .impl((fn) => ({
        transaction: fn().mockImplementation((run) => run(tx)),
      }))
      .compile();
    service = unit;
    db = unitRef.get<Database>(getDrizzleToken());
    cache = unitRef.get<Cache>(CACHE_MANAGER);
  });

  it('inserts the survey then its questions, positioned by request order', async () => {
    const survey = { id: 's1', slug: 'feedback' };
    returning.mockResolvedValueOnce([survey]).mockResolvedValueOnce([
      { id: 'q2', prompt: 'Rating?', position: 1 },
      { id: 'q1', prompt: 'Name?', position: 0 },
    ]);

    const result = await service.create(dto);

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(values).toHaveBeenNthCalledWith(2, [
      {
        surveyId: 's1',
        type: 'short_text',
        prompt: 'Name?',
        required: true,
        position: 0,
        options: null,
      },
      {
        surveyId: 's1',
        type: 'single_choice',
        prompt: 'Rating?',
        required: false,
        position: 1,
        options: ['Good', 'Bad'],
      },
    ]);
    expect(result.questions.map((q) => q.prompt)).toEqual(['Name?', 'Rating?']);
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
    const items = [{ id: 's1' }, { id: 's2' }];
    let where: Stub<unknown[]>;

    beforeEach(() => {
      where = stub().mockResolvedValue([{ total: 9 }]);
      db.query.surveys.findMany.mockResolvedValue(items as never);
      db.select.mockReturnValue({ from: () => ({ where }) } as never);
    });

    it('returns the page the database finds and the total count', async () => {
      await expect(service.list({ limit: 10, offset: 20 })).resolves.toEqual({
        items,
        total: 9,
      });
      expect(db.query.surveys.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20, where: undefined }),
      );
      expect(where).toHaveBeenCalledWith(undefined);
    });

    it('filters both the page and the count by status when given', async () => {
      await service.list({ limit: 50, offset: 0, status: 'draft' });
      const { where: pageWhere } = db.query.surveys.findMany.mock.calls[0][0]!;
      expect(pageWhere).toBeDefined();
      expect(where).toHaveBeenCalledWith(pageWhere);
    });
  });

  describe('findById', () => {
    const surveyId = '22222222-2222-4222-8222-222222222222';

    it('returns the survey the database finds, questions included', async () => {
      const survey = { id: surveyId, title: 'Feedback', questions: [] };
      db.query.surveys.findFirst.mockResolvedValue(survey as never);

      await expect(service.findById(surveyId)).resolves.toBe(survey);
      expect(db.query.surveys.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          with: {
            questions: expect.objectContaining({ orderBy: expect.anything() }),
          },
        }),
      );
    });

    it('throws NotFoundException when no survey has the id', async () => {
      db.query.surveys.findFirst.mockResolvedValue(undefined);
      await expect(service.findById(surveyId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('listSubmissions', () => {
    const surveyId = '22222222-2222-4222-8222-222222222222';

    it('returns the page the database finds and the total count', async () => {
      const items = [{ id: 'sub1', answers: [] }];
      db.query.surveys.findFirst.mockResolvedValue({ id: surveyId } as never);
      db.query.surveyAnswerSubmissions.findMany.mockResolvedValue(
        items as never,
      );
      db.select.mockReturnValue({
        from: () => ({ where: () => Promise.resolve([{ total: 7 }]) }),
      } as never);

      await expect(
        service.listSubmissions(surveyId, { limit: 10, offset: 20 }),
      ).resolves.toEqual({ items, total: 7 });
      expect(db.query.surveyAnswerSubmissions.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 20 }),
      );
    });

    it('throws NotFoundException when no survey has the id', async () => {
      db.query.surveys.findFirst.mockResolvedValue(undefined);
      await expect(
        service.listSubmissions(surveyId, { limit: 50, offset: 0 }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.query.surveyAnswerSubmissions.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    const surveyId = '22222222-2222-4222-8222-222222222222';
    let returning: Stub<unknown[]>;

    beforeEach(() => {
      returning = stub();
      db.update.mockReturnValue({
        set: () => ({ where: () => ({ returning }) }),
      } as never);
      db.query.surveys.findFirst
        .mockResolvedValueOnce({ id: surveyId, slug: 'old' } as never)
        .mockResolvedValueOnce({
          id: surveyId,
          slug: 'new',
          questions: [],
        } as never);
    });

    it('updates the row, drops both cached public responses and returns the survey', async () => {
      returning.mockResolvedValue([{ slug: 'new' }]);

      const result = await service.update(surveyId, { slug: 'new' });

      expect(result).toMatchObject({ id: surveyId, slug: 'new' });
      expect(cache.del).toHaveBeenCalledWith('/public/surveys/old');
      expect(cache.del).toHaveBeenCalledWith('/public/surveys/new');
    });

    it('drops the one cached response when the slug is unchanged', async () => {
      returning.mockResolvedValue([{ slug: 'old' }]);
      await service.update(surveyId, { status: 'closed' });
      expect(cache.del).toHaveBeenCalledTimes(1);
      expect(cache.del).toHaveBeenCalledWith('/public/surveys/old');
    });

    it('maps a unique violation on the slug to ConflictException', async () => {
      returning.mockRejectedValue(
        new Error('Failed query', { cause: { code: '23505' } }),
      );
      await expect(
        service.update(surveyId, { slug: 'taken' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(cache.del).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no survey has the id', async () => {
      db.query.surveys.findFirst.mockReset().mockResolvedValue(undefined);
      await expect(
        service.update(surveyId, { title: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const surveyId = '22222222-2222-4222-8222-222222222222';
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
      await expect(service.remove(surveyId)).resolves.toBeUndefined();
      expect(cache.del).toHaveBeenCalledWith('/public/surveys/gone');
    });

    it('throws NotFoundException when nothing was deleted', async () => {
      returning.mockResolvedValue([]);
      await expect(service.remove(surveyId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(cache.del).not.toHaveBeenCalled();
    });
  });
});
