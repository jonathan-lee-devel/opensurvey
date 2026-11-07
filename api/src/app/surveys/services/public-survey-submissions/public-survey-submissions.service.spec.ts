import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { mock, stub } from '@suites/doubles.vitest';
import type { Mocked, Stub } from '@suites/unit';
import { TestBed } from '@suites/unit';

import type { ClientMetadata } from '../../../../common/client-metadata.decorator.js';
import type { Database } from '../../../../database/database.types.js';
import { PublicSurveySubmissionsService } from './public-survey-submissions.service.js';

const q = {
  name: '11111111-1111-4111-8111-111111111111',
  rating: '22222222-2222-4222-8222-222222222222',
  topping: '33333333-3333-4333-8333-333333333333',
  toppings: '44444444-4444-4444-8444-444444444444',
  essay: '55555555-5555-4555-8555-555555555555',
  other: '99999999-9999-4999-8999-999999999999',
};

const survey = {
  id: 's1',
  questions: [
    { id: q.name, type: 'short_text', required: true, options: null },
    { id: q.rating, type: 'rating', required: false, options: null },
    {
      id: q.topping,
      type: 'single_choice',
      required: false,
      options: ['Cheese', 'Olives'],
    },
    {
      id: q.toppings,
      type: 'multiple_choice',
      required: false,
      options: ['Cheese', 'Olives', 'Ham'],
    },
    { id: q.essay, type: 'long_text', required: false, options: null },
  ],
};

const client: ClientMetadata = {
  ipAddress: '203.0.113.7',
  userAgent: 'curl/8.0',
  referer: null,
};

const validAnswers = [
  { questionId: q.name, value: 'Ada' },
  { questionId: q.rating, value: 4 },
  { questionId: q.topping, value: 'Cheese' },
  { questionId: q.toppings, value: ['Cheese', 'Ham'] },
  { questionId: q.essay, value: 'Lovely.' },
];

describe('PublicSurveySubmissionsService', () => {
  let service: PublicSurveySubmissionsService;
  let db: Mocked<Database>;
  // Each tx.insert(...).values(...) call pops the next result; the first
  // chains .returning(), the second resolves on its own.
  let values: Stub<unknown[]>;
  let returning: Stub<unknown[]>;

  beforeEach(async () => {
    returning = stub().mockResolvedValue([
      { id: 'sub1', surveyId: 's1', submittedAt: new Date('2026-11-07') },
    ]);
    values = stub()
      .mockReturnValueOnce({ returning })
      .mockResolvedValueOnce(undefined);
    const tx = mock<Database>();
    tx.insert.mockReturnValue({ values } as never);

    const { unit, unitRef } = await TestBed.solitary(
      PublicSurveySubmissionsService,
    )
      .mock<Database>(getDrizzleToken())
      .impl((fn) => ({
        transaction: fn().mockImplementation((run) => run(tx)),
      }))
      .compile();
    service = unit;
    db = unitRef.get<Database>(getDrizzleToken());
    db.query.surveys.findFirst.mockResolvedValue(survey as never);
  });

  const problemsOf = async (answers: unknown[]) => {
    const error = await service
      .create('feedback', { answers } as never, client)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    return (error as UnprocessableEntityException).getResponse() as {
      message: string[];
    };
  };

  it('inserts the submission with the client metadata, then the answers', async () => {
    const result = await service.create(
      'feedback',
      { answers: validAnswers },
      client,
    );

    expect(db.transaction).toHaveBeenCalledOnce();
    expect(values).toHaveBeenNthCalledWith(1, {
      surveyId: 's1',
      ipAddress: '203.0.113.7',
      userAgent: 'curl/8.0',
      referer: null,
    });
    expect(values).toHaveBeenNthCalledWith(
      2,
      validAnswers.map((a) => ({
        submissionId: 'sub1',
        questionId: a.questionId,
        value: a.value,
      })),
    );
    expect(result).toMatchObject({ id: 'sub1', surveyId: 's1' });
  });

  it('throws NotFoundException when no published survey has the slug', async () => {
    db.query.surveys.findFirst.mockResolvedValue(undefined);
    await expect(
      service.create('missing', { answers: validAnswers }, client),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects an answer to a question of another survey', async () => {
    const { message } = await problemsOf([
      { questionId: q.name, value: 'Ada' },
      { questionId: q.other, value: 'x' },
    ]);
    expect(message).toEqual([
      'answers.1.questionId: not a question of this survey',
    ]);
  });

  it('rejects a missing required answer', async () => {
    const { message } = await problemsOf([{ questionId: q.rating, value: 3 }]);
    expect(message).toEqual([
      `answers: required question "${q.name}" is missing`,
    ]);
  });

  it('rejects values that do not fit their question type, one message each', async () => {
    const { message } = await problemsOf([
      { questionId: q.name, value: '   ' },
      { questionId: q.rating, value: 6 },
      { questionId: q.topping, value: 'Pineapple' },
      { questionId: q.toppings, value: ['Cheese', 'Cheese'] },
      { questionId: q.essay, value: 7 },
    ]);
    expect(message).toEqual([
      'answers.0.value: must be text of 1 to 500 characters',
      'answers.1.value: must be an integer from 1 to 5',
      "answers.2.value: must be one of the question's options",
      'answers.3.value: must be one or more distinct options of the question',
      'answers.4.value: must be text of 1 to 5000 characters',
    ]);
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('rejects a non-integer rating and an empty choice list', async () => {
    const { message } = await problemsOf([
      { questionId: q.name, value: 'Ada' },
      { questionId: q.rating, value: 3.5 },
      { questionId: q.toppings, value: [] },
    ]);
    expect(message).toHaveLength(2);
  });

  it('maps a foreign key violation to UnprocessableEntityException', async () => {
    returning.mockRejectedValue(
      new Error('Failed query', { cause: { code: '23503' } }),
    );
    await expect(
      service.create('feedback', { answers: validAnswers }, client),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
