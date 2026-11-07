import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { createRemoteJWKSet } from 'jose';

import type { EnvService } from '../config/env.schema.js';
import { AUTH_KEY_SET } from './auth.constants.js';
import { AuthGuard } from './guards/auth.guard.js';
import { ClaimsGuard } from './guards/claims.guard.js';
import { TokenVerifierService } from './services/token-verifier/token-verifier.service.js';

/**
 * Authentication and claims-based authorization for every route.
 *
 * Importing this module registers two global guards, in this order:
 *
 * 1. `AuthGuard` requires a JWT Bearer token on every route and attaches the
 *    verified caller as `request.user`. Opt a handler or controller out with
 *    `@IsPublic()`.
 * 2. `ClaimsGuard` enforces `@HasClaim('...')`: the caller's token must hold
 *    each listed claim, or the route answers 403.
 *
 * Tokens are verified against the JSON Web Key Set at AUTH_JWKS_URL, which
 * `jose` fetches on first use, caches, and refetches when a token names a
 * `kid` it has not seen (rate limited, so a flood of bad tokens cannot hammer
 * the issuer). The `iss` claim must equal AUTH_ISSUER and, when set, `aud`
 * must contain AUTH_AUDIENCE.
 */
@Module({
  providers: [
    {
      provide: AUTH_KEY_SET,
      inject: [ConfigService],
      useFactory: (config: EnvService) =>
        createRemoteJWKSet(
          new URL(config.getOrThrow('AUTH_JWKS_URL', { infer: true })),
        ),
    },
    TokenVerifierService,
    // Registration order is execution order: authenticate, then check claims.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ClaimsGuard },
  ],
  exports: [TokenVerifierService],
})
export class AuthModule {}
