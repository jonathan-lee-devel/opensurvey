import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getDrizzleToken } from '@nestjs/drizzle';
import { Test } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { Redis } from 'ioredis';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { EnvService } from './../src/config/env.schema.js';
import { Database } from './../src/database/database.types.js';
import { polls, users } from './../src/database/schema/index.js';

// Exercises CacheInterceptor exactly as the public controllers register it,
// against the Testcontainers Redis that test/global-setup.ts starts.
describe('Public response cache (e2e)', () => {
  let app: INestApplication;
  let db: Database;
  let redis: Redis;
  let ownerId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    db = app.get<Database>(getDrizzleToken());

    const config = app.get<EnvService>(ConfigService);
    redis = new Redis(config.getOrThrow('REDIS_URL', { infer: true }));
    // Earlier files in the run may have left entries for the same URLs.
    await flushCache();

    const [owner] = await db
      .insert(users)
      .values({ email: 'cache-e2e@example.com', displayName: 'Ada' })
      .returning({ id: users.id });
    ownerId = owner.id;
    await db.insert(polls).values({
      ownerId,
      question: 'Cached?',
      slug: 'cached',
      status: 'published',
    });
  });

  afterAll(async () => {
    await flushCache();
    redis.disconnect();
    // Cascades to the polls.
    await db.delete(users);
    await app.close();
  });

  async function cacheKeys(): Promise<string[]> {
    return redis.keys('cache*');
  }

  async function flushCache(): Promise<void> {
    const keys = await cacheKeys();
    if (keys.length > 0) await redis.del(...keys);
  }

  describe('GET /public/polls/:slug', () => {
    it('answers the first request from the database and stores it in Redis', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/polls/cached')
        .expect(200);
      expect(res.headers['x-cache']).toBe('MISS');
      expect(res.body).toMatchObject({ question: 'Cached?', slug: 'cached' });

      const keys = await cacheKeys();
      expect(keys).toEqual([expect.stringContaining('/public/polls/cached')]);
      expect(JSON.stringify(await redis.get(keys[0]))).toContain('Cached?');
    });

    it('serves the stored body on repeat requests, with CACHE_TTL_MS left to run', async () => {
      // Changing the row proves the body comes from Redis, not the database.
      await db
        .update(polls)
        .set({ question: 'Changed in the database' })
        .where(eq(polls.slug, 'cached'));

      const res = await request(app.getHttpServer())
        .get('/public/polls/cached')
        .expect(200);
      expect(res.headers['x-cache']).toBe('HIT');
      expect(res.body.question).toBe('Cached?');

      const config = app.get<EnvService>(ConfigService);
      const ttl = config.get('CACHE_TTL_MS', { infer: true });
      const [key] = await cacheKeys();
      const remaining = await redis.pttl(key);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(ttl);
    });

    it('still counts cache hits against the rate limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/public/polls/cached')
        .expect(200);
      expect(res.headers['x-cache']).toBe('HIT');
      expect(res.headers['x-ratelimit-limit']).toBeDefined();
      expect(res.headers['x-ratelimit-remaining']).toBeDefined();
    });

    it('does not cache a 404', async () => {
      for (let i = 0; i < 2; i++) {
        const res = await request(app.getHttpServer())
          .get('/public/polls/missing')
          .expect(404);
        expect(res.headers['x-cache']).toBe('MISS');
      }
      const keys = await cacheKeys();
      expect(keys.some((k) => k.includes('/public/polls/missing'))).toBe(false);
    });
  });

  describe('the other public routes', () => {
    it('caches GET /public/users/:id', async () => {
      const url = `/public/users/${ownerId}`;
      const first = await request(app.getHttpServer()).get(url).expect(200);
      expect(first.headers['x-cache']).toBe('MISS');
      const second = await request(app.getHttpServer()).get(url).expect(200);
      expect(second.headers['x-cache']).toBe('HIT');
      expect(second.body).toEqual(first.body);
    });

    it('caches GET /public/surveys/:slug only once it answers 200', async () => {
      const miss = await request(app.getHttpServer())
        .get('/public/surveys/none')
        .expect(404);
      expect(miss.headers['x-cache']).toBe('MISS');
      const keys = await cacheKeys();
      expect(keys.some((k) => k.includes('/public/surveys/'))).toBe(false);
    });
  });

  describe('admin routes', () => {
    it('are not cached', async () => {
      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .send({ email: 'cache-admin@example.com' })
        .expect(201);
      expect(res.headers['x-cache']).toBeUndefined();
      const keys = await cacheKeys();
      expect(keys.some((k) => k.includes('/admin/'))).toBe(false);
    });
  });
});
