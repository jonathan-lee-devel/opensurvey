import {
  ConflictException,
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
});
