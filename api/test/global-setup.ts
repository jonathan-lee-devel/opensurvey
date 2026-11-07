import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer } from '@testcontainers/redis';
import { exportJWK, generateKeyPair } from 'jose';
import type { TestProject } from 'vitest/node';

import type { TestIssuer } from './auth.js';

/**
 * Starts a throwaway PostgreSQL and Redis for the end-to-end tests, and a
 * throwaway identity provider: an ES256 key pair whose public half is served
 * as a JSON Web Key Set from a local HTTP server. Vitest runs this once in its
 * main process before any worker starts, and workers inherit `process.env`, so
 * `DatabaseModule` connects to the PostgreSQL container and applies the
 * migrations to an empty database, `ThrottlerModule` and `CacheModule` keep
 * their rate-limit counters and cached responses in the Redis container, and
 * `AuthModule` fetches its keys from the local JWKS. The private key reaches
 * the test files through `provide()`, so `test/auth.ts` can sign tokens the
 * API accepts. The development services in the repository's docker-compose.yml
 * are never touched, whatever `.env` says.
 */
export default async function setup(
  project: TestProject,
): Promise<() => Promise<void>> {
  // Same images as docker-compose.yml, so tests and development match.
  const [postgres, redis, jwks] = await Promise.all([
    new PostgreSqlContainer('postgres:17-alpine').start(),
    new RedisContainer('redis:8-alpine').start(),
    startIssuer(),
  ]);
  process.env.DATABASE_URL = postgres.getConnectionUri();
  process.env.REDIS_URL = redis.getConnectionUrl();
  process.env.AUTH_JWKS_URL = jwks.url;
  process.env.AUTH_ISSUER = jwks.issuer.issuer;
  process.env.AUTH_AUDIENCE = jwks.issuer.audience;
  project.provide('authIssuer', jwks.issuer);

  return async () => {
    await Promise.all([postgres.stop(), redis.stop(), jwks.close()]);
  };
}

async function startIssuer(): Promise<{
  url: string;
  issuer: TestIssuer;
  close: () => Promise<void>;
}> {
  const kid = 'e2e-key';
  const { publicKey, privateKey } = await generateKeyPair('ES256', {
    extractable: true,
  });
  const publicJwk = { ...(await exportJWK(publicKey)), kid, alg: 'ES256' };
  const body = JSON.stringify({ keys: [publicJwk] });

  const server: Server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/.well-known/jwks.json') {
      res.setHeader('Content-Type', 'application/json');
      res.end(body);
      return;
    }
    res.statusCode = 404;
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}/.well-known/jwks.json`,
    issuer: {
      issuer: 'https://issuer.opensurvey.test',
      audience: 'opensurvey-api',
      kid,
      privateJwk: { ...(await exportJWK(privateKey)), kid },
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
