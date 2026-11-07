import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import Redis from 'ioredis';
import request from 'supertest';

import { AppModule } from './../src/app.module.js';
import { EnvService } from './../src/config/env.schema.js';

/**
 * A throwaway controller, so the test exercises the guard exactly as the
 * application registers it (`APP_GUARD` in AppModule) without depending on any
 * feature module's routes. Each test uses its own route: the guard keys its
 * counters by controller, handler and client IP, so routes do not share them.
 */
@Controller('throttler-test')
class ThrottlerTestController {
  @Get('defaults')
  defaults() {
    return { ok: true };
  }

  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @Get('tight')
  tight() {
    return { ok: true };
  }

  @SkipThrottle()
  @Get('skipped')
  skipped() {
    return { ok: true };
  }
}

describe('ThrottlerGuard (e2e)', () => {
  let app: INestApplication;
  let redis: Redis;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ThrottlerTestController],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const config = app.get<EnvService>(ConfigService);
    redis = new Redis(config.getOrThrow('REDIS_URL', { infer: true }));
  });

  afterAll(async () => {
    redis.disconnect();
    await app.close();
  });

  it('applies the configured defaults to routes without an override', async () => {
    const config = app.get<EnvService>(ConfigService);
    const limit = config.get('THROTTLE_LIMIT', { infer: true });

    const res = await request(app.getHttpServer())
      .get('/throttler-test/defaults')
      .expect(200);
    expect(res.headers['x-ratelimit-limit']).toBe(String(limit));
    expect(res.headers['x-ratelimit-remaining']).toBe(String(limit - 1));
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
  });

  it('answers 429 with Retry-After once a route exceeds its limit', async () => {
    const server = app.getHttpServer();

    const first = await request(server)
      .get('/throttler-test/tight')
      .expect(200);
    expect(first.headers['x-ratelimit-limit']).toBe('2');
    expect(first.headers['x-ratelimit-remaining']).toBe('1');

    const second = await request(server)
      .get('/throttler-test/tight')
      .expect(200);
    expect(second.headers['x-ratelimit-remaining']).toBe('0');

    const third = await request(server)
      .get('/throttler-test/tight')
      .expect(429);
    expect(Number(third.headers['retry-after'])).toBeGreaterThan(0);
    expect(third.body.message).toMatch(/Too Many Requests/);
  });

  it('skips routes marked @SkipThrottle()', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 5; i++) {
      const res = await request(server)
        .get('/throttler-test/skipped')
        .expect(200);
      expect(res.headers['x-ratelimit-limit']).toBeUndefined();
    }
  });

  it('keeps its counters in Redis', async () => {
    const keys = await redis.keys('*:default}:hits');
    expect(keys.length).toBeGreaterThanOrEqual(2);
  });
});
