import { Inject, Injectable, Logger } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IdempotencyStorage } from '@nestjs/idempotency';
import type {
  IdempotencyAcquireResult,
  IdempotencyStore,
  IdempotencyStoredPayload,
} from '@nestjs/idempotency';
import { Redis } from 'ioredis';

import type { EnvService } from '../config/env.schema.js';

// Each method is one Lua script, which Redis runs atomically, so the
// guarantees hold with any number of API instances. Every script touches a
// single key, so the store also works with Redis Cluster.

// Creates the lock if no record exists. Otherwise returns the record, in the
// same round trip.
const ACQUIRE = `
if redis.call('EXISTS', KEYS[1]) == 0 then
  redis.call('HSET', KEYS[1], 'state', 'in-flight', 'fp', ARGV[1], 'owner', ARGV[2])
  redis.call('PEXPIRE', KEYS[1], ARGV[3])
  return {1}
end
local r = redis.call('HMGET', KEYS[1], 'state', 'fp', 'resp')
return {0, r[1], r[2], r[3]}
`;

// Turns our lock into a completed record, unless another attempt took it over.
const COMPLETE = `
if redis.call('HGET', KEYS[1], 'owner') ~= ARGV[1] then return 0 end
redis.call('HSET', KEYS[1], 'state', 'completed', 'resp', ARGV[2])
redis.call('HDEL', KEYS[1], 'owner')
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return 1
`;

// Deletes the lock, but only if it is still ours.
const RELEASE = `
if redis.call('HGET', KEYS[1], 'owner') == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

// Renews our lock while the handler runs, but only if it is still ours.
const EXTEND = `
if redis.call('HGET', KEYS[1], 'owner') ~= ARGV[1] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return 1
`;

type AcquireReply = [1] | [0, 'in-flight' | 'completed', string, string | null];

/**
 * Keeps `@nestjs/idempotency` records in Redis (REDIS_URL), so every API
 * instance sees the same locks and replays, and a crashed instance's lock
 * expires on its own. Each record is a hash at `idem:<scope>:<key>` that Redis
 * expires itself: `lockTtl` after the last renewal while in flight, `ttl` once
 * completed. No pruning job is needed.
 *
 * Like the throttler storage, it owns its connection and closes it on
 * shutdown. Registering with `IdempotencyStorage` in the constructor makes it
 * the app's store; `IdempotencyModule` logs it at startup.
 */
@Injectable()
export class RedisIdempotencyStore
  implements IdempotencyStore, OnApplicationShutdown
{
  private readonly redis: Redis;

  constructor(
    @Inject(ConfigService) config: EnvService,
    storage: IdempotencyStorage,
  ) {
    this.redis = new Redis(config.getOrThrow('REDIS_URL', { infer: true }));
    this.redis.on('error', (error: Error) => {
      new Logger(RedisIdempotencyStore.name).error(
        `Redis idempotency store error: ${error.message}`,
        error.stack,
      );
    });
    storage.registerSource(this);
  }

  async acquire(
    key: string,
    owner: string,
    fingerprint: string,
    lockTtl: number,
  ): Promise<IdempotencyAcquireResult> {
    const reply = (await this.redis.eval(
      ACQUIRE,
      1,
      this.key(key),
      fingerprint,
      owner,
      lockTtl,
    )) as AcquireReply;
    if (reply[0] === 1) {
      return { state: 'acquired' };
    }
    const [, state, storedFingerprint, response] = reply;
    return state === 'completed'
      ? {
          state,
          fingerprint: storedFingerprint,
          response: JSON.parse(response ?? 'null') as IdempotencyStoredPayload,
        }
      : { state, fingerprint: storedFingerprint };
  }

  async complete(
    key: string,
    owner: string,
    response: IdempotencyStoredPayload,
    ttl: number,
  ): Promise<boolean> {
    const done = await this.redis.eval(
      COMPLETE,
      1,
      this.key(key),
      owner,
      JSON.stringify(response),
      ttl,
    );
    return done === 1;
  }

  async release(key: string, owner: string): Promise<boolean> {
    const released = await this.redis.eval(RELEASE, 1, this.key(key), owner);
    return released === 1;
  }

  async extend(key: string, owner: string, lockTtl: number): Promise<boolean> {
    const extended = await this.redis.eval(
      EXTEND,
      1,
      this.key(key),
      owner,
      lockTtl,
    );
    return extended === 1;
  }

  async onApplicationShutdown() {
    await this.redis.quit();
  }

  /** Own prefix, so the records stay apart from the cache and the throttler. */
  private key(key: string) {
    return `idem:${key}`;
  }
}
