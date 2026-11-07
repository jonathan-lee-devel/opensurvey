import { createKeyv } from '@keyv/redis';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Logger, Module, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { IdempotencyModule } from '@nestjs/idempotency';
import { createObserveModule } from '@nestjs/observe';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Request } from 'express';

import { PollsModule } from './app/polls/polls.module.js';
import { SurveysModule } from './app/surveys/surveys.module.js';
import { UsersModule } from './app/users/users.module.js';
import { envSchema, EnvService } from './config/env.schema.js';
import { DatabaseModule } from './database/database.module.js';
import { RedisIdempotencyStore } from './idempotency/redis-idempotency.store.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Loads `.env` from the working directory, merges it with the process
    // environment (which wins) and validates the result against envSchema.
    // Global, so any module can inject ConfigService without importing this
    // module; never read `process.env` directly.
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envSchema,
      // Tests get everything they need from test/global-setup.ts; a developer's
      // `.env` (Observe keys included) must not leak into them.
      ignoreEnvFile: process.env.NODE_ENV === 'test',
    }),
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com,
    // then run `npx @nestjs/observe link` to write your key pair into .env.
    // With no key pair configured, Observe logs a warning and sends nothing.
    ObserveModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: EnvService) => ({
        appKey: config.get('OBSERVE_APP_KEY', { infer: true }),
        appSecret: config.get('OBSERVE_APP_SECRET', { infer: true }),
        serviceId: 'api',
      }),
    }),
    // Rate limiting. One throttler named `default` limits every route to
    // THROTTLE_LIMIT requests per client IP per THROTTLE_TTL_MS, enforced by
    // the global ThrottlerGuard below. Counters live in Redis so all API
    // instances share them; the storage service owns the connection and closes
    // it on shutdown. Override per route with @Throttle() or @SkipThrottle().
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: EnvService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get('THROTTLE_TTL_MS', { infer: true }),
            limit: config.get('THROTTLE_LIMIT', { infer: true }),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          config.getOrThrow('REDIS_URL', { infer: true }),
        ),
      }),
    }),
    // Response cache for the public read routes. The `public-*` controllers
    // opt in with @UseInterceptors(CacheInterceptor), which stores each GET's
    // JSON body in Redis under its URL for CACHE_TTL_MS and answers repeats
    // from there, flagged with an X-Cache: HIT header. Entries live in the
    // `cache` namespace, apart from the rate limiter's counters; the module
    // disconnects the store on shutdown. A Redis outage only disables caching:
    // the interceptor falls through to the handler and logs the failure.
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: (config: EnvService) => {
        const store = createKeyv(
          config.getOrThrow('REDIS_URL', { infer: true }),
          { namespace: 'cache' },
        );
        // Keyv emits connection failures as `error` events; left unhandled
        // they would crash the process instead of degrading to no cache.
        store.on('error', (error: Error) => {
          new Logger(CacheModule.name).error(
            `Redis cache store error: ${error.message}`,
            error.stack,
          );
        });
        return {
          stores: [store],
          ttl: config.get('CACHE_TTL_MS', { infer: true }),
        };
      },
    }),
    // Idempotency keys for the public writes. A handler marked @Idempotent()
    // runs once per Idempotency-Key and every retry gets the stored result;
    // other routes are untouched. Keys are scoped by client IP until there is
    // a signed-in user to scope them by, so one client's key cannot replay
    // another's response. Records live in Redis (RedisIdempotencyStore below).
    IdempotencyModule.forRoot({
      scope: (req: Request) => req.ip,
    }),
    DatabaseModule,
    SurveysModule,
    PollsModule,
    UsersModule,
  ],
  providers: [
    // Validates every @Body/@Query/@Param that declares a Zod `schema` and
    // passes the parsed value to the handler; parameters without a schema go
    // through untouched. Registered here rather than in main.ts so e2e tests
    // that build the app from AppModule get the same behaviour.
    { provide: APP_PIPE, useClass: StandardSchemaValidationPipe },
    // Applies the ThrottlerModule limits to every route and answers 429 with
    // Retry-After and X-RateLimit-* headers once a client exceeds them.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Registers itself with IdempotencyStorage when Nest creates it.
    RedisIdempotencyStore,
  ],
})
export class AppModule {}
