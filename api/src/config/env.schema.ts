import type { ConfigService } from '@nestjs/config';
import { z } from 'zod';

/**
 * Every environment variable the API reads. `ConfigModule.forRoot()` validates
 * the merged `.env` + process environment against this schema at startup and
 * serves the parsed values, so `PORT` is a number by the time code reads it,
 * and a missing or malformed variable stops the boot with a message per field.
 *
 * Add a variable here before reading it through `ConfigService`, and mirror it
 * in `.env.example`.
 */
export const envSchema = z.object({
  PORT: z.coerce.number().int().min(0).max(65535).default(3000),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error:
      'must be a postgres:// connection string. Copy .env.example to .env and point it at a PostgreSQL database.',
  }),
  // Backs the rate limiter (ThrottlerModule in app.module.ts), so every API
  // instance shares one set of counters, and the public response cache
  // (CacheModule), so every instance serves the same cached bodies.
  REDIS_URL: z.url({
    protocol: /^rediss?$/,
    error:
      'must be a redis:// connection string. Copy .env.example to .env and point it at a Redis server.',
  }),
  // Rate limit applied to every route: THROTTLE_LIMIT requests per client IP
  // per THROTTLE_TTL_MS window. Routes can override it with @Throttle().
  THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  // How long a public GET response stays in the Redis cache, in milliseconds.
  CACHE_TTL_MS: z.coerce.number().int().positive().default(60_000),
  // Optional: Express's `trust proxy` setting, needed behind a reverse proxy
  // or load balancer so the rate limiter sees client IPs instead of the
  // proxy's. Accepts what Express does: `true`, a hop count such as `1`, or a
  // comma-separated list of addresses, ranges or names such as `loopback`.
  TRUST_PROXY: z.string().trim().min(1).optional(),
  // Authentication (AuthModule in src/auth/). Every route needs a JWT Bearer
  // token unless marked @IsPublic(). Tokens are verified against the keys the
  // issuer publishes at AUTH_JWKS_URL (https, or http on localhost for a
  // development issuer), and their `iss` claim must equal AUTH_ISSUER.
  AUTH_JWKS_URL: z.url({
    protocol: /^https?$/,
    error:
      "must be the https:// URL of the identity provider's JSON Web Key Set, such as https://login.example.com/.well-known/jwks.json.",
  }),
  AUTH_ISSUER: z.string().trim().min(1, {
    error: 'must be the `iss` claim the identity provider puts in its tokens.',
  }),
  // Optional: when set, the token's `aud` claim must contain it. Leave it unset
  // only for issuers that do not put an audience in their access tokens.
  AUTH_AUDIENCE: z.string().trim().min(1).optional(),
  // Optional: without a key pair Observe warns at startup and sends nothing.
  OBSERVE_APP_KEY: z.string().optional(),
  OBSERVE_APP_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/** `ConfigService` typed against the schema: `get('PORT', { infer: true })` is a `number`. */
export type EnvService = ConfigService<Env, true>;
