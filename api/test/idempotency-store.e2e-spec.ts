import { INestApplication } from '@nestjs/common';
import { IdempotencyStorage } from '@nestjs/idempotency';
import { idempotencyStoreContract } from '@nestjs/idempotency/testing';
import { Test } from '@nestjs/testing';

import { AppModule } from './../src/app.module.js';
import { RedisIdempotencyStore } from './../src/idempotency/redis-idempotency.store.js';

/**
 * Runs the package's store contract against RedisIdempotencyStore on the
 * Testcontainers Redis, as AppModule wires it: every method, the owner
 * checks, expiry (waited for in real time, since Redis keeps its own clock)
 * and the races that a read-then-write store gets wrong.
 */
describe('RedisIdempotencyStore (e2e)', () => {
  let app: INestApplication;
  let store: RedisIdempotencyStore;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    store = app.get(IdempotencyStorage).source as RedisIdempotencyStore;
  });

  afterAll(async () => {
    await app.close();
  });

  it('is the store IdempotencyModule uses', () => {
    expect(store).toBeInstanceOf(RedisIdempotencyStore);
  });

  // Expiry cases wait about 3 * lockTtl + lockTtl / 4 in real time.
  const cases = idempotencyStoreContract(() => store, {
    lockTtl: 400,
    concurrent: true,
  });
  for (const c of cases) {
    it(c.name, c.run, 15_000);
  }
});
