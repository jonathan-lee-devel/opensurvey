import { INestApplication } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { Database } from './../src/database/database.types.js';
import {
  pollOptions,
  polls,
  surveyQuestions,
  surveys,
  users,
} from './../src/database/schema/index.js';

// Rows go straight into the Testcontainers database, so these tests cover the
// controllers' queries against the real schema and relations.
describe('Public controllers (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let ownerId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<Database>(getDrizzleToken());

    const [owner] = await db
      .insert(users)
      .values({ email: 'public-e2e@example.com', displayName: 'Ada' })
      .returning({ id: users.id });
    ownerId = owner.id;

    const [poll] = await db
      .insert(polls)
      .values({
        ownerId,
        question: 'Lunch?',
        slug: 'lunch',
        status: 'published',
      })
      .returning({ id: polls.id });
    await db.insert(pollOptions).values([
      { pollId: poll.id, label: 'Tacos', position: 1 },
      { pollId: poll.id, label: 'Pizza', position: 0 },
    ]);
    await db
      .insert(polls)
      .values({ ownerId, question: 'Secret', slug: 'draft-poll' });

    const [survey] = await db
      .insert(surveys)
      .values({
        ownerId,
        title: 'Feedback',
        slug: 'feedback',
        status: 'published',
      })
      .returning({ id: surveys.id });
    await db.insert(surveyQuestions).values([
      {
        surveyId: survey.id,
        type: 'single_choice',
        prompt: 'Rating?',
        position: 1,
        options: ['Good', 'Bad'],
      },
      {
        surveyId: survey.id,
        type: 'short_text',
        prompt: 'Name?',
        required: true,
        position: 0,
      },
    ]);
  });

  afterAll(async () => {
    // Cascades to the polls, surveys and their children.
    await db.delete(users);
    await app.close();
  });

  describe('GET /public/polls/:slug', () => {
    it('returns a published poll with its options in order', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/polls/lunch')
        .expect(200);
      expect(res.body).toMatchObject({
        question: 'Lunch?',
        slug: 'lunch',
        status: 'published',
        closesAt: null,
      });
      expect(res.body.ownerId).toBeUndefined();
      expect(res.body.options.map((o: { label: string }) => o.label)).toEqual([
        'Pizza',
        'Tacos',
      ]);
    });

    it('hides drafts', async () => {
      await request(app.getHttpServer())
        .get('/public/polls/draft-poll')
        .expect(404);
    });
  });

  describe('GET /public/surveys/:slug', () => {
    it('returns a published survey with its questions in order', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/surveys/feedback')
        .expect(200);
      expect(res.body).toMatchObject({ title: 'Feedback', slug: 'feedback' });
      expect(res.body.ownerId).toBeUndefined();
      expect(res.body.questions).toEqual([
        expect.objectContaining({ prompt: 'Name?', required: true }),
        expect.objectContaining({
          prompt: 'Rating?',
          options: ['Good', 'Bad'],
        }),
      ]);
    });

    it('answers 404 for an unknown slug', async () => {
      await request(app.getHttpServer())
        .get('/public/surveys/nope')
        .expect(404);
    });
  });

  describe('GET /public/users/:id', () => {
    it('returns the public profile without the email', async () => {
      const res = await request(app.getHttpServer())
        .get(`/public/users/${ownerId}`)
        .expect(200);
      expect(res.body).toMatchObject({ id: ownerId, displayName: 'Ada' });
      expect(res.body.email).toBeUndefined();
    });

    it('rejects a non-uuid id with 400', async () => {
      await request(app.getHttpServer()).get('/public/users/abc').expect(400);
    });

    it('answers 404 for an unknown user', async () => {
      await request(app.getHttpServer())
        .get('/public/users/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });
});
