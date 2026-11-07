import { INestApplication } from '@nestjs/common';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { Database } from './../src/database/database.types.js';
import { users } from './../src/database/schema/index.js';

const missingOwner = '00000000-0000-4000-8000-000000000000';

describe('Admin controllers (e2e)', () => {
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
  });

  afterAll(async () => {
    // Cascades to the polls, surveys and their children.
    await db.delete(users);
    await app.close();
  });

  describe('POST /admin/users', () => {
    it('creates a user with a lowercased email', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
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
        .send({ email: 'admin-e2e@EXAMPLE.com' })
        .expect(409);
    });

    it('rejects an invalid email and unknown keys with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
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

  describe('POST /admin/polls', () => {
    it('creates a poll with ordered options and makes it publicly readable', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/polls')
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

  describe('POST /admin/surveys', () => {
    it('creates a survey with ordered questions and makes it publicly readable', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/surveys')
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

      await request(app.getHttpServer())
        .get('/public/surveys/admin-feedback')
        .expect(200);
    });

    it('rejects a choice question without options with 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/surveys')
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
        .send({ ownerId, title: 'Dup', slug: 'admin-feedback', questions })
        .expect(409);
      await request(app.getHttpServer())
        .post('/admin/surveys')
        .send({
          ownerId: missingOwner,
          title: 'Orphan',
          slug: 'admin-orphan-survey',
          questions,
        })
        .expect(422);
    });
  });
});
