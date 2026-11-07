import { importJWK, SignJWT } from 'jose';
import type { JWK, JWTPayload } from 'jose';
import { inject } from 'vitest';

/**
 * What `test/global-setup.ts` publishes about the throwaway identity provider
 * it runs for the e2e tests, handed to every test file through Vitest's
 * `provide()`/`inject()`. The private key never leaves the test run.
 */
export interface TestIssuer {
  /** The `iss` the API expects (AUTH_ISSUER). */
  issuer: string;
  /** The `aud` the API expects (AUTH_AUDIENCE). */
  audience: string;
  /** The `kid` of the one key in the JWKS the API fetches. */
  kid: string;
  /** The ES256 private key that signs test tokens. */
  privateJwk: JWK;
}

declare module 'vitest' {
  export interface ProvidedContext {
    authIssuer: TestIssuer;
  }
}

/**
 * Signs an access token the API accepts: `iss`, `aud` and `sub` filled in,
 * valid for five minutes. Any claim given overrides the default, so a test can
 * add roles (`{ roles: ['azg12345_SurveyAdmin'] }`) or break the token on
 * purpose (`{ iss: 'https://evil.test' }`, `{ exp: 0 }`).
 */
export async function accessToken(claims: JWTPayload = {}): Promise<string> {
  const { issuer, audience, kid, privateJwk } = inject('authIssuer');
  const key = await importJWK(privateJwk, 'ES256');
  const payload: JWTPayload = {
    iss: issuer,
    aud: audience,
    sub: 'e2e-user',
    ...claims,
  };
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'ES256', kid })
    .setIssuedAt();
  if (payload.exp === undefined) jwt.setExpirationTime('5m');
  return jwt.sign(key);
}

/** `Authorization` header value for a token from `accessToken()`. */
export async function bearer(claims: JWTPayload = {}): Promise<string> {
  return `Bearer ${await accessToken(claims)}`;
}
