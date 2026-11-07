import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { Database } from './../src/database/database.types.js';
import {
  surveyAnswers,
  surveyAnswerSubmissions,
  surveyQuestions,
  surveys,
  users,
} from './../src/database/schema/index.js';

/**
 * Covers the public submission route against the Testcontainers PostgreSQL
 * and Redis: the rows it writes, the metadata it records, the answer checks,
 * and the idempotency replay through the Redis store. TRUST_PROXY is applied
 * in main.ts, not AppModule, so X-Forwarded-For is not exercised here: the
 * recorded address is supertest's loopback.
 */
describe('POST /public/surveys/:slug/submissions (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let surveyId: string;
  let nameId: string;
  let ratingId: string;
  let toppingsId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<Database>(getDrizzleToken());

    const [owner] = await db
      .insert(users)
      .values({ email: 'submissions-e2e@example.com' })
      .returning({ id: users.id });
    const [survey] = await db
      .insert(surveys)
      .values({
        ownerId: owner.id,
        title: 'Feedback',
        slug: 'sub-feedback',
        status: 'published',
      })
      .returning({ id: surveys.id });
    surveyId = survey.id;
    const questions = await db
      .insert(surveyQuestions)
      .values([
        {
          surveyId,
          type: 'short_text',
          prompt: 'Name?',
          required: true,
          position: 0,
        },
        { surveyId, type: 'rating', prompt: 'Score?', position: 1 },
        {
          surveyId,
          type: 'multiple_choice',
          prompt: 'Toppings?',
          position: 2,
          options: ['Cheese', 'Olives'],
        },
      ])
      .returning({
        id: surveyQuestions.id,
        position: surveyQuestions.position,
      });
    questions.sort((a, b) => a.position - b.position);
    [nameId, ratingId, toppingsId] = questions.map((q) => q.id);
    await db.insert(surveys).values({
      ownerId: owner.id,
      title: 'Draft',
      slug: 'sub-draft',
    });
  });

  afterAll(async () => {
    // Cascades to the surveys, submissions and answers.
    await db.delete(users);
    await app.close();
  });

  const submit = (slug: string, body: object, key = randomUUID()) =>
    request(app.getHttpServer())
      .post(`/public/surveys/${slug}/submissions`)
      .set('Idempotency-Key', key)
      .set('User-Agent', 'submissions-e2e/1.0')
      .set('Referer', 'https://example.com/s/sub-feedback')
      .send(body);

  it('records the submission with its answers and the client metadata', async () => {
    const res = await submit('sub-feedback', {
      answers: [
        { questionId: nameId, value: 'Ada' },
        { questionId: ratingId, value: 5 },
        { questionId: toppingsId, value: ['Olives'] },
      ],
    }).expect(201);
    expect(res.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      surveyId,
      submittedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(res.body.ipAddress).toBeUndefined();

    const submission = await db.query.surveyAnswerSubmissions.findFirst({
      where: eq(surveyAnswerSubmissions.id, res.body.id),
      with: { answers: true },
    });
    expect(submission).toMatchObject({
      surveyId,
      respondentId: null,
      userAgent: 'submissions-e2e/1.0',
      referer: 'https://example.com/s/sub-feedback',
    });
    // supertest connects over loopback; the exact form depends on the stack.
    expect(submission?.ipAddress).toMatch(/^(::ffff:)?127\.0\.0\.1$|^::1$/);
    expect(submission?.answers.map((a) => a.value)).toEqual(
      expect.arrayContaining(['Ada', 5, ['Olives']]),
    );
    expect(submission?.answers).toHaveLength(3);
  });

  it('replays a retry with the same key instead of submitting twice', async () => {
    const key = randomUUID();
    const body = { answers: [{ questionId: nameId, value: 'Retry' }] };
    const first = await submit('sub-feedback', body, key).expect(201);
    const retry = await submit('sub-feedback', body, key)
      .expect(201)
      .expect('Idempotent-Replayed', 'true');
    expect(retry.body).toEqual(first.body);

    const rows = await db
      .select({ id: surveyAnswers.id })
      .from(surveyAnswers)
      .where(eq(surveyAnswers.submissionId, first.body.id));
    expect(rows).toHaveLength(1);
  });

  it('refuses the same key with a different body with 422', async () => {
    const key = randomUUID();
    await submit(
      'sub-feedback',
      {
        answers: [{ questionId: nameId, value: 'One' }],
      },
      key,
    ).expect(201);
    const res = await submit(
      'sub-feedback',
      {
        answers: [{ questionId: nameId, value: 'Two' }],
      },
      key,
    ).expect(422);
    expect(res.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('requires an Idempotency-Key header', async () => {
    const res = await request(app.getHttpServer())
      .post('/public/surveys/sub-feedback/submissions')
      .send({ answers: [{ questionId: nameId, value: 'Ada' }] })
      .expect(400);
    expect(res.body.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
  });

  it('answers 404 for a draft survey and an unknown slug', async () => {
    const answers = [{ questionId: nameId, value: 'Ada' }];
    await submit('sub-draft', { answers }).expect(404);
    await submit('sub-nope', { answers }).expect(404);
  });

  it('answers 422 listing every answer that does not fit', async () => {
    const res = await submit('sub-feedback', {
      answers: [
        { questionId: ratingId, value: 9 },
        { questionId: toppingsId, value: ['Pineapple'] },
      ],
    }).expect(422);
    expect(res.body.message).toEqual([
      'answers.0.value: must be an integer from 1 to 5',
      'answers.1.value: must be one or more distinct options of the question',
      `answers: required question "${nameId}" is missing`,
    ]);
  });

  it('rejects a malformed body with 400 before touching the database', async () => {
    const res = await submit('sub-feedback', {
      answers: [
        { questionId: nameId, value: 'Ada' },
        { questionId: nameId, value: 'Twice' },
      ],
      extra: true,
    }).expect(400);
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^answers\.1\.questionId: answered more than once/,
        ),
        expect.stringMatching(/extra/),
      ]),
    );
  });
});
