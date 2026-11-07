import { randomUUID } from 'node:crypto';

import { INestApplication } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { SURVEY_ADMIN_CLAIM } from './../src/auth/auth.constants.js';
import { Database } from './../src/database/database.types.js';
import { users } from './../src/database/schema/index.js';
import { bearer } from './auth.js';

const missingOwner = '00000000-0000-4000-8000-000000000000';

describe('Admin controllers (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let ownerId: string;
  let surveyId: string;
  let questionIds: string[];
  // The admin routes need a Bearer token holding the admin claim (AuthGuard
  // then ClaimsGuard); the public ones need neither.
  let auth: string;
  let pollId: string;

  beforeAll(async () => {
    auth = await bearer({ sub: 'admin-e2e', roles: [SURVEY_ADMIN_CLAIM] });
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<Database>(getDrizzleToken());
  });

  afterAll(async () => {
    // Cascades to the polls, surveys and their children.
    await db.delete(users);
    await app.close();
  });

  describe('the admin claim', () => {
    it('answers 403 to a signed-in caller without it, on every admin controller', async () => {
      const viewer = await bearer({ sub: 'viewer-e2e', roles: ['viewer'] });
      for (const path of ['/admin/users', '/admin/polls', '/admin/surveys']) {
        const res = await request(app.getHttpServer())
          .get(path)
          .set('Authorization', viewer)
          .expect(403);
        expect(res.body.message).toContain(SURVEY_ADMIN_CLAIM);
      }
    });
  });

  describe('POST /admin/users', () => {
    it('creates a user with a lowercased email', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', auth)
        .send({ email: 'Admin-E2E@Example.com', displayName: 'Ada' })
        .expect(201);
      expect(res.body).toMatchObject({
        email: 'admin-e2e@example.com',
        displayName: 'Ada',
      });
      expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
      ownerId = res.body.id;
    });

    it('answers 409 for a duplicate email, whatever its case', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', auth)
        .send({ email: 'admin-e2e@EXAMPLE.com' })
        .expect(409);
    });

    it('rejects an invalid email and unknown keys with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', auth)
        .send({ email: 'not-an-email', role: 'admin' })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^email: /),
          expect.stringMatching(/role/),
        ]),
      );
    });
  });

  describe('GET /admin/users', () => {
    it('lists users newest first and pages while total counts everyone', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', auth)
        .send({ email: 'second-e2e@example.com' })
        .expect(201);

      const all = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', auth)
        .expect(200);
      expect(all.body.total).toBe(2);
      expect(all.body.items.map((u: { email: string }) => u.email)).toEqual([
        'second-e2e@example.com',
        'admin-e2e@example.com',
      ]);

      const page = await request(app.getHttpServer())
        .get('/admin/users?limit=1&offset=1')
        .set('Authorization', auth)
        .expect(200);
      expect(page.body.items).toEqual([
        expect.objectContaining({ email: 'admin-e2e@example.com' }),
      ]);
      expect(page.body.total).toBe(2);
    });

    it('answers 400 for bad paging and 401 without a token', async () => {
      await request(app.getHttpServer())
        .get('/admin/users?limit=0')
        .set('Authorization', auth)
        .expect(400);
      await request(app.getHttpServer()).get('/admin/users').expect(401);
    });
  });

  describe('POST /admin/polls', () => {
    it('creates a poll with ordered options and makes it publicly readable', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/polls')
        .set('Authorization', auth)
        .send({
          ownerId,
          question: 'Lunch?',
          slug: 'admin-lunch',
          status: 'published',
          closesAt: '2030-01-01T12:00:00Z',
          options: ['Pizza', 'Tacos', 'Salad'],
        })
        .expect(201);
      expect(res.body).toMatchObject({
        ownerId,
        question: 'Lunch?',
        slug: 'admin-lunch',
        status: 'published',
        closesAt: '2030-01-01T12:00:00.000Z',
      });
      expect(res.body.options).toEqual([
        expect.objectContaining({ label: 'Pizza', position: 0 }),
        expect.objectContaining({ label: 'Tacos', position: 1 }),
        expect.objectContaining({ label: 'Salad', position: 2 }),
      ]);
      pollId = res.body.id;

      const pub = await request(app.getHttpServer())
        .get('/public/polls/admin-lunch')
        .expect(200);
      expect(pub.body.options.map((o: { label: string }) => o.label)).toEqual([
        'Pizza',
        'Tacos',
        'Salad',
      ]);
    });

    it('defaults to a draft, which is not publicly readable', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/polls')
        .set('Authorization', auth)
        .send({
          ownerId,
          question: 'Dinner?',
          slug: 'admin-dinner',
          options: ['In', 'Out'],
        })
        .expect(201);
      expect(res.body).toMatchObject({ status: 'draft', closesAt: null });
      await request(app.getHttpServer())
        .get('/public/polls/admin-dinner')
        .expect(404);
    });

    it('answers 409 for a duplicate slug', async () => {
      await request(app.getHttpServer())
        .post('/admin/polls')
        .set('Authorization', auth)
        .send({
          ownerId,
          question: 'Again?',
          slug: 'admin-lunch',
          options: ['Yes', 'No'],
        })
        .expect(409);
    });

    it('answers 422 when the owner does not exist', async () => {
      await request(app.getHttpServer())
        .post('/admin/polls')
        .set('Authorization', auth)
        .send({
          ownerId: missingOwner,
          question: 'Orphan?',
          slug: 'admin-orphan',
          options: ['Yes', 'No'],
        })
        .expect(422);
    });

    it('rejects fewer than two options and a bad slug with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/polls')
        .set('Authorization', auth)
        .send({
          ownerId,
          question: 'One?',
          slug: 'Not A Slug',
          options: ['Only'],
        })
        .expect(400);
      expect(res.body.message).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/^slug: /),
          expect.stringMatching(/^options: /),
        ]),
      );
    });
  });

  describe('GET /admin/polls and GET /admin/polls/:id', () => {
    it('lists polls newest first without options, filtered by status', async () => {
      const all = await request(app.getHttpServer())
        .get('/admin/polls')
        .set('Authorization', auth)
        .expect(200);
      expect(all.body.total).toBe(2);
      expect(all.body.items.map((p: { slug: string }) => p.slug)).toEqual([
        'admin-dinner',
        'admin-lunch',
      ]);
      expect(all.body.items[0]).not.toHaveProperty('options');

      const drafts = await request(app.getHttpServer())
        .get('/admin/polls?status=draft&limit=1')
        .set('Authorization', auth)
        .expect(200);
      expect(drafts.body.items).toEqual([
        expect.objectContaining({ slug: 'admin-dinner', status: 'draft' }),
      ]);
      expect(drafts.body.total).toBe(1);
    });

    it('returns one poll with its owner and ordered options', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/polls/${pollId}`)
        .set('Authorization', auth)
        .expect(200);
      expect(res.body).toMatchObject({
        id: pollId,
        ownerId,
        slug: 'admin-lunch',
      });
      expect(res.body.options.map((o: { label: string }) => o.label)).toEqual([
        'Pizza',
        'Tacos',
        'Salad',
      ]);
    });

    it('answers 404 for an unknown id, 400 for a malformed one and a bad status', async () => {
      await request(app.getHttpServer())
        .get(`/admin/polls/${missingOwner}`)
        .set('Authorization', auth)
        .expect(404);
      await request(app.getHttpServer())
        .get('/admin/polls/not-a-uuid')
        .set('Authorization', auth)
        .expect(400);
      await request(app.getHttpServer())
        .get('/admin/polls?status=archived')
        .set('Authorization', auth)
        .expect(400);
    });
  });

  describe('POST /admin/surveys', () => {
    it('creates a survey with ordered questions and makes it publicly readable', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/surveys')
        .set('Authorization', auth)
        .send({
          ownerId,
          title: 'Feedback',
          description: 'Tell us more',
          slug: 'admin-feedback',
          status: 'published',
          questions: [
            { type: 'short_text', prompt: 'Name?', required: true },
            {
              type: 'multiple_choice',
              prompt: 'Toppings?',
              options: ['Cheese', 'Olives'],
            },
            { type: 'rating', prompt: 'Score?' },
          ],
        })
        .expect(201);
      expect(res.body).toMatchObject({
        ownerId,
        title: 'Feedback',
        description: 'Tell us more',
        status: 'published',
      });
      expect(res.body.questions).toEqual([
        expect.objectContaining({
          prompt: 'Name?',
          required: true,
          position: 0,
          options: null,
        }),
        expect.objectContaining({
          prompt: 'Toppings?',
          required: false,
          position: 1,
          options: ['Cheese', 'Olives'],
        }),
        expect.objectContaining({ prompt: 'Score?', position: 2 }),
      ]);
      surveyId = res.body.id;
      questionIds = res.body.questions.map((q: { id: string }) => q.id);

      await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback')
        .expect(200);
    });

    it('rejects a choice question without options with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/surveys')
        .set('Authorization', auth)
        .send({
          ownerId,
          title: 'Broken',
          slug: 'admin-broken',
          questions: [{ type: 'single_choice', prompt: 'Pick?' }],
        })
        .expect(400);
      expect(res.body.message).toEqual([
        expect.stringMatching(/^questions\.0\.options: /),
      ]);
    });

    it('rejects options on a text question with 400', async () => {
      await request(app.getHttpServer())
        .post('/admin/surveys')
        .set('Authorization', auth)
        .send({
          ownerId,
          title: 'Broken',
          slug: 'admin-broken',
          questions: [
            { type: 'long_text', prompt: 'Why?', options: ['A', 'B'] },
          ],
        })
        .expect(400);
    });

    it('answers 409 for a duplicate slug and 422 for a missing owner', async () => {
      const questions = [{ type: 'rating', prompt: 'Score?' }];
      await request(app.getHttpServer())
        .post('/admin/surveys')
        .set('Authorization', auth)
        .send({ ownerId, title: 'Dup', slug: 'admin-feedback', questions })
        .expect(409);
      await request(app.getHttpServer())
        .post('/admin/surveys')
        .set('Authorization', auth)
        .send({
          ownerId: missingOwner,
          title: 'Orphan',
          slug: 'admin-orphan-survey',
          questions,
        })
        .expect(422);
    });
  });

  describe('GET /admin/surveys/:id', () => {
    it('returns the survey with its owner and ordered questions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .expect(200);
      expect(res.body).toMatchObject({
        id: surveyId,
        ownerId,
        title: 'Feedback',
        description: 'Tell us more',
        slug: 'admin-feedback',
        status: 'published',
      });
      expect(res.body.questions.map((q: { id: string }) => q.id)).toEqual(
        questionIds,
      );
      expect(res.body.questions[1]).toMatchObject({
        type: 'multiple_choice',
        prompt: 'Toppings?',
        position: 1,
        options: ['Cheese', 'Olives'],
      });
    });

    it('returns a draft survey too', async () => {
      const created = await request(app.getHttpServer())
        .post('/admin/surveys')
        .set('Authorization', auth)
        .send({
          ownerId,
          title: 'Draft',
          slug: 'admin-draft',
          questions: [{ type: 'rating', prompt: 'Score?' }],
        })
        .expect(201);
      const res = await request(app.getHttpServer())
        .get(`/admin/surveys/${created.body.id}`)
        .set('Authorization', auth)
        .expect(200);
      expect(res.body.status).toBe('draft');
    });

    it('answers 404 for an unknown id, 400 for a malformed one and 401 without a token', async () => {
      await request(app.getHttpServer())
        .get(`/admin/surveys/${missingOwner}`)
        .set('Authorization', auth)
        .expect(404);
      await request(app.getHttpServer())
        .get('/admin/surveys/not-a-uuid')
        .set('Authorization', auth)
        .expect(400);
      await request(app.getHttpServer())
        .get(`/admin/surveys/${surveyId}`)
        .expect(401);
    });
  });

  describe('GET /admin/surveys', () => {
    // By now two surveys exist: admin-feedback (published) then admin-draft.
    it('lists every survey newest first, without questions', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/surveys')
        .set('Authorization', auth)
        .expect(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items.map((s: { slug: string }) => s.slug)).toEqual([
        'admin-draft',
        'admin-feedback',
      ]);
      expect(res.body.items[1]).toMatchObject({
        id: surveyId,
        ownerId,
        title: 'Feedback',
        status: 'published',
      });
      expect(res.body.items[1]).not.toHaveProperty('questions');
    });

    it('filters by status and pages while total counts the filter', async () => {
      const drafts = await request(app.getHttpServer())
        .get('/admin/surveys?status=draft')
        .set('Authorization', auth)
        .expect(200);
      expect(drafts.body.total).toBe(1);
      expect(drafts.body.items.map((s: { slug: string }) => s.slug)).toEqual([
        'admin-draft',
      ]);

      const page = await request(app.getHttpServer())
        .get('/admin/surveys?limit=1&offset=1')
        .set('Authorization', auth)
        .expect(200);
      expect(page.body.total).toBe(2);
      expect(page.body.items.map((s: { slug: string }) => s.slug)).toEqual([
        'admin-feedback',
      ]);
    });

    it('answers 400 for a bad status or paging and 401 without a token', async () => {
      await request(app.getHttpServer())
        .get('/admin/surveys?status=archived')
        .set('Authorization', auth)
        .expect(400);
      await request(app.getHttpServer())
        .get('/admin/surveys?limit=0')
        .set('Authorization', auth)
        .expect(400);
      await request(app.getHttpServer()).get('/admin/surveys').expect(401);
    });
  });

  describe('GET /admin/surveys/:id/submissions', () => {
    const submit = (answers: unknown[]) =>
      request(app.getHttpServer())
        .post('/public/surveys/admin-feedback/submissions')
        .set('Idempotency-Key', randomUUID())
        .set('User-Agent', 'admin-e2e/1.0')
        .send({ answers });

    it('lists the submissions newest first with metadata and answers', async () => {
      const [nameId, toppingsId, scoreId] = questionIds;
      const first = await submit([
        { questionId: nameId, value: 'Ada' },
        { questionId: scoreId, value: 4 },
      ]).expect(201);
      const second = await submit([
        { questionId: nameId, value: 'Grace' },
        { questionId: toppingsId, value: ['Cheese', 'Olives'] },
      ]).expect(201);

      const res = await request(app.getHttpServer())
        .get(`/admin/surveys/${surveyId}/submissions`)
        .set('Authorization', auth)
        .expect(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items.map((s: { id: string }) => s.id)).toEqual([
        second.body.id,
        first.body.id,
      ]);
      expect(res.body.items[0]).toMatchObject({
        surveyId,
        respondentId: null,
        userAgent: 'admin-e2e/1.0',
        referer: null,
      });
      expect(res.body.items[0].ipAddress).toMatch(/127\.0\.0\.1|::1/);
      // Answers carry their full question, in the survey's question order.
      expect(res.body.items[0].answers).toEqual([
        expect.objectContaining({
          value: 'Grace',
          question: {
            id: nameId,
            type: 'short_text',
            prompt: 'Name?',
            required: true,
            position: 0,
            options: null,
          },
        }),
        expect.objectContaining({
          value: ['Cheese', 'Olives'],
          question: expect.objectContaining({
            id: toppingsId,
            type: 'multiple_choice',
            position: 1,
            options: expect.arrayContaining(['Cheese', 'Olives']),
          }),
        }),
      ]);
      expect(res.body.items[0].answers[0]).not.toHaveProperty('questionId');
    });

    it('pages with limit and offset while total counts everything', async () => {
      const res = await request(app.getHttpServer())
        .get(`/admin/surveys/${surveyId}/submissions?limit=1&offset=1`)
        .set('Authorization', auth)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.total).toBe(2);
    });

    it('answers 404 for an unknown survey and 400 for bad paging', async () => {
      await request(app.getHttpServer())
        .get(`/admin/surveys/${missingOwner}/submissions`)
        .set('Authorization', auth)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/admin/surveys/${surveyId}/submissions?limit=0`)
        .set('Authorization', auth)
        .expect(400);
    });
  });

  describe('PATCH /admin/surveys/:id', () => {
    it('changes the fields given, keeps the rest, and bumps updatedAt', async () => {
      const before = await request(app.getHttpServer())
        .get(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .send({ title: 'Feedback, revised', description: null })
        .expect(200);
      expect(res.body).toMatchObject({
        id: surveyId,
        title: 'Feedback, revised',
        description: null,
        slug: 'admin-feedback',
        status: 'published',
      });
      expect(res.body.questions).toHaveLength(3);
      expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(
        new Date(before.body.updatedAt).getTime(),
      );
    });

    it('closing drops the cached public response, so the link stops answering', async () => {
      // Warm the cache, then prove the next read comes from Redis.
      await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback')
        .expect(200);
      const hit = await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback')
        .expect(200);
      expect(hit.headers['x-cache']).toBe('HIT');

      await request(app.getHttpServer())
        .patch(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .send({ status: 'closed' })
        .expect(200);
      await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback')
        .expect(404);
    });

    it('renaming the slug moves the survey to its new link', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .send({ slug: 'admin-feedback-2', status: 'published' })
        .expect(200);
      await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback')
        .expect(404);
      await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback-2')
        .expect(200);
    });

    it('answers 409 for a slug another survey has', async () => {
      await request(app.getHttpServer())
        .post('/admin/surveys')
        .set('Authorization', auth)
        .send({
          ownerId,
          title: 'Other',
          slug: 'admin-other',
          questions: [{ type: 'short_text', prompt: 'Why?' }],
        })
        .expect(201);
      await request(app.getHttpServer())
        .patch(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .send({ slug: 'admin-other' })
        .expect(409);
    });

    it('answers 400 for an empty body, unknown keys or questions, and 404 for an unknown id', async () => {
      await request(app.getHttpServer())
        .patch(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .send({})
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .send({ questions: [] })
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/admin/surveys/${missingOwner}`)
        .set('Authorization', auth)
        .send({ title: 'x' })
        .expect(404);
    });
  });

  describe('DELETE /admin/surveys/:id', () => {
    it('removes the survey, its submissions and its public link', async () => {
      // Warm the cache so the delete has something to drop.
      await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback-2')
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .expect(404);
      await request(app.getHttpServer())
        .get(`/admin/surveys/${surveyId}/submissions`)
        .set('Authorization', auth)
        .expect(404);
      await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback-2')
        .expect(404);
    });

    it('answers 404 the second time and for a malformed id 400', async () => {
      await request(app.getHttpServer())
        .delete(`/admin/surveys/${surveyId}`)
        .set('Authorization', auth)
        .expect(404);
      await request(app.getHttpServer())
        .delete('/admin/surveys/not-a-uuid')
        .set('Authorization', auth)
        .expect(400);
    });
  });
});
