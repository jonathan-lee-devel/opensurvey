import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';

/**
 * Starts a throwaway PostgreSQL and Redis for the end-to-end tests. Vitest runs
 * this once in its main process before any worker starts, and workers inherit
 * `process.env`, so `DatabaseModule` connects to the PostgreSQL container and
 * applies the migrations to an empty database, and `ThrottlerModule` keeps its
 * rate-limit counters in the Redis container. The development services in the
 * repository's docker-compose.yml are never touched, whatever `.env` says.
 */
export default async function setup(): Promise<() => Promise<void>> {
  // Same images as docker-compose.yml, so tests and development match.
  const [postgres, redis] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine').start(),
    new RedisContainer('redis:8-alpine').start(),
  ]);
  process.env.DATABASE_URL = postgres.getConnectionUri();
  process.env.REDIS_URL = redis.getConnectionUrl();

  return async () => {
    await Promise.all([postgres.stop(), redis.stop()]);
  };
}
