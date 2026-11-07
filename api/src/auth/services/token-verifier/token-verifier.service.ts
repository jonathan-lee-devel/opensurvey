import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { errors, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

import type { EnvService } from '../../../config/env.schema.js';
import { ALLOWED_ALGORITHMS, AUTH_KEY_SET } from '../../auth.constants.js';
import type { AuthenticatedUser } from '../../auth.types.js';

/**
 * Checks a JWT Bearer token and turns it into the `AuthenticatedUser` the
 * guards attach to the request. The signature is verified against the key set
 * injected as AUTH_KEY_SET (`AuthModule` builds it from AUTH_JWKS_URL, cached
 * and refetched by `jose` when it meets an unknown `kid`); the token must
 * also carry AUTH_ISSUER as `iss`, AUTH_AUDIENCE in `aud` when configured, a
 * `sub`, and an `exp` that has not passed.
 */
@Injectable()
export class TokenVerifierService {
  private readonly issuer: string;
  private readonly audience: string | undefined;

  constructor(
    @Inject(ConfigService) config: EnvService,
    @Inject(AUTH_KEY_SET) private readonly keySet: JWTVerifyGetKey,
  ) {
    this.issuer = config.getOrThrow('AUTH_ISSUER', { infer: true });
    this.audience = config.get('AUTH_AUDIENCE', { infer: true });
  }

  /**
   * Resolves the caller for a valid token and throws `UnauthorizedException`
   * for anything else, with a message that names what failed (`exp` passed,
   * wrong `iss`, unknown key) but never echoes the token.
   */
  async verify(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.keySet, {
        algorithms: ALLOWED_ALGORITHMS,
        issuer: this.issuer,
        // Left undefined, jose skips the audience check.
        audience: this.audience,
        requiredClaims: ['sub', 'exp'],
      });
      return { subject: payload.sub as string, claims: payload };
    } catch (error) {
      throw new UnauthorizedException(describe(error), { cause: error });
    }
  }
}

function describe(error: unknown): string {
  if (error instanceof errors.JWTExpired) return 'Token has expired';
  if (error instanceof errors.JWTClaimValidationFailed) {
    return `Token claim "${error.claim}" is ${error.reason}`;
  }
  if (error instanceof errors.JWKSNoMatchingKey) {
    return 'Token was not signed by a known key';
  }
  if (error instanceof errors.JWKSTimeout) {
    return 'The key set could not be fetched in time';
  }
  return 'Token is invalid';
}
