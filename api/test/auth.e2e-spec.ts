import { Controller, Get, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Throttle } from '@nestjs/throttler';
import { exportJWK, generateKeyPair, importJWK, SignJWT } from 'jose';
import request from 'supertest';
import { inject } from 'vitest';

import { AppModule } from './../src/app.module.js';
import type { AuthenticatedUser } from './../src/auth/auth.types.js';
import { CurrentUser } from './../src/auth/decorators/current-user.decorator.js';
import { HasClaim } from './../src/auth/decorators/has-claim.decorator.js';
import { IsPublic } from './../src/auth/decorators/is-public.decorator.js';
import { bearer } from './auth.js';

const ADMIN = 'azg12345_SurveyAdmin';
const BILLING = 'azg12345_Billing';

/**
 * Throwaway controllers, so the tests exercise the guards exactly as
 * `AuthModule` registers them (APP_GUARD, after the ThrottlerGuard) without
 * depending on any feature module's routes.
 */
@Controller('auth-test')
class AuthTestController {
  @IsPublic()
  @Get('public')
  open(@CurrentUser() user?: AuthenticatedUser) {
    return { user: user ?? null };
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }

  @HasClaim(ADMIN)
  @Post('admin-only')
  adminOnly() {
    return { ok: true };
  }

  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  @Get('tight')
  tight() {
    return { ok: true };
  }
}

@IsPublic()
@Controller('auth-test/public-class')
class PublicClassController {
  @Get()
  list() {
    return { ok: true };
  }
}

@HasClaim(ADMIN)
@Controller('auth-test/admins')
class AdminsController {
  @Get()
  list() {
    return { ok: true };
  }

  @HasClaim(BILLING)
  @Get('billing')
  billing() {
    return { ok: true };
  }
}

describe('AuthModule (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [
        AuthTestController,
        PublicClassController,
        AdminsController,
      ],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('@IsPublic()', () => {
    it('lets anonymous callers reach a public handler, with no user', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth-test/public')
        .expect(200);
      expect(res.body).toEqual({ user: null });
    });

    it('ignores a token on a public route rather than verifying it', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth-test/public')
        .set('Authorization', 'Bearer not-even-a-jwt')
        .expect(200);
      expect(res.body).toEqual({ user: null });
    });

    it('applies to every handler of a public controller', async () => {
      await request(app.getHttpServer())
        .get('/auth-test/public-class')
        .expect(200);
    });

    it('is what keeps the /public routes open', async () => {
      // 404, not 401: the guard let the anonymous request reach the handler.
      await request(app.getHttpServer())
        .get('/public/polls/no-such-poll')
        .expect(404);
    });
  });

  describe('AuthGuard', () => {
    it('answers 401 with a Bearer challenge when the header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth-test/me')
        .expect(401);
      expect(res.headers['www-authenticate']).toBe('Bearer realm="opensurvey"');
      expect(res.body.message).toBe('Missing Bearer token');
    });

    it('protects the admin routes by default', async () => {
      await request(app.getHttpServer())
        .post('/admin/users')
        .send({ email: 'anon@example.com' })
        .expect(401);
    });

    it('rejects a malformed token as invalid_token', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth-test/me')
        .set('Authorization', 'Bearer not-a-jwt')
        .expect(401);
      expect(res.headers['www-authenticate']).toBe(
        'Bearer realm="opensurvey", error="invalid_token"',
      );
      expect(res.body.message).toBe('Token is invalid');
    });

    it('rejects a token signed by a key the JWKS does not list', async () => {
      const { issuer, audience } = inject('authIssuer');
      const stranger = await generateKeyPair('ES256', { extractable: true });
      const token = await new SignJWT({ sub: 'intruder' })
        .setProtectedHeader({ alg: 'ES256', kid: 'stranger' })
        .setIssuer(issuer)
        .setAudience(audience)
        .setExpirationTime('5m')
        .sign(stranger.privateKey);
      const res = await request(app.getHttpServer())
        .get('/auth-test/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(res.body.message).toBe('Token was not signed by a known key');
    });

    it('rejects a token forged under the real kid', async () => {
      const { issuer, audience, kid } = inject('authIssuer');
      const stranger = await generateKeyPair('ES256');
      const token = await new SignJWT({ sub: 'intruder' })
        .setProtectedHeader({ alg: 'ES256', kid })
        .setIssuer(issuer)
        .setAudience(audience)
        .setExpirationTime('5m')
        .sign(stranger.privateKey);
      const res = await request(app.getHttpServer())
        .get('/auth-test/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
      expect(res.body.message).toBe('Token is invalid');
    });

    it('rejects an expired token and the wrong issuer or audience', async () => {
      const server = app.getHttpServer();
      const expired = await request(server)
        .get('/auth-test/me')
        .set('Authorization', await bearer({ exp: 1_000_000_000 }))
        .expect(401);
      expect(expired.body.message).toBe('Token has expired');

      const issuer = await request(server)
        .get('/auth-test/me')
        .set('Authorization', await bearer({ iss: 'https://evil.test' }))
        .expect(401);
      expect(issuer.body.message).toMatch(/claim "iss"/);

      const audience = await request(server)
        .get('/auth-test/me')
        .set('Authorization', await bearer({ aud: 'another-api' }))
        .expect(401);
      expect(audience.body.message).toMatch(/claim "aud"/);
    });

    it('attaches the verified caller for @CurrentUser()', async () => {
      const { issuer, audience } = inject('authIssuer');
      const res = await request(app.getHttpServer())
        .get('/auth-test/me')
        .set('Authorization', await bearer({ sub: 'ada', roles: [ADMIN] }))
        .expect(200);
      expect(res.body.subject).toBe('ada');
      expect(res.body.claims).toMatchObject({
        sub: 'ada',
        iss: issuer,
        aud: audience,
        roles: [ADMIN],
      });
      expect(res.body.claims.exp).toBeGreaterThan(Date.now() / 1000);
    });

    it('runs after the rate limiter, so unauthenticated floods are throttled', async () => {
      const server = app.getHttpServer();
      await request(server).get('/auth-test/tight').expect(401);
      await request(server).get('/auth-test/tight').expect(401);
      await request(server).get('/auth-test/tight').expect(429);
    });

    it('accepts the key as exported for the tests', async () => {
      // Guards against a broken fixture masquerading as a passing 401 test.
      const { privateJwk } = inject('authIssuer');
      await expect(importJWK(privateJwk, 'ES256')).resolves.toBeDefined();
      const { publicKey } = await generateKeyPair('ES256');
      expect(await exportJWK(publicKey)).toHaveProperty('kty', 'EC');
    });
  });

  describe('@HasClaim()', () => {
    it('passes a caller whose roles list the claim', async () => {
      await request(app.getHttpServer())
        .post('/auth-test/admin-only')
        .set('Authorization', await bearer({ roles: ['viewer', ADMIN] }))
        .expect(201);
    });

    it('passes a caller carrying the claim as a payload key', async () => {
      await request(app.getHttpServer())
        .post('/auth-test/admin-only')
        .set('Authorization', await bearer({ [ADMIN]: true }))
        .expect(201);
    });

    it('answers 403 to an authenticated caller without the claim', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth-test/admin-only')
        .set('Authorization', await bearer({ roles: ['viewer'] }))
        .expect(403);
      expect(res.body.message).toBe(`Missing required claim: ${ADMIN}`);
    });

    it('answers 401, not 403, to an anonymous caller', async () => {
      await request(app.getHttpServer())
        .post('/auth-test/admin-only')
        .expect(401);
    });

    it('applies a controller-level claim to every handler', async () => {
      const server = app.getHttpServer();
      await request(server)
        .get('/auth-test/admins')
        .set('Authorization', await bearer({ roles: [ADMIN] }))
        .expect(200);
      await request(server)
        .get('/auth-test/admins')
        .set('Authorization', await bearer({ roles: ['viewer'] }))
        .expect(403);
    });

    it('adds a handler-level claim to the controller-level one', async () => {
      const server = app.getHttpServer();
      const onlyAdmin = await request(server)
        .get('/auth-test/admins/billing')
        .set('Authorization', await bearer({ roles: [ADMIN] }))
        .expect(403);
      expect(onlyAdmin.body.message).toBe(`Missing required claim: ${BILLING}`);
      await request(server)
        .get('/auth-test/admins/billing')
        .set('Authorization', await bearer({ roles: [ADMIN, BILLING] }))
        .expect(200);
    });
  });
});
