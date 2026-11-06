import { PostgreSqlContainer } from '@testcontainers/postgresql';

/**
 * Starts a throwaway PostgreSQL for the end-to-end tests. Vitest runs this once
 * in its main process before any worker starts, and workers inherit
 * `process.env`, so `DatabaseModule` connects to the container and applies the
 * migrations to an empty database. The dev database in docker-compose.yml is
 * never touched, whatever `.env` says.
 */
export default async function setup(): Promise<() => Promise<void>> {
  // Same image as docker-compose.yml, so tests and development match.
  const container = await new PostgreSqlContainer('postgres:17-alpine').start();
  process.env.DATABASE_URL = container.getConnectionUri();

  return async () => {
    await container.stop();
  };
}
