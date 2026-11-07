import type { JWSAlgorithm } from 'jose';

/** Metadata key set by `@IsPublic()`; `AuthGuard` lets the request through when it is `true`. */
export const IS_PUBLIC_KEY = 'auth:isPublic';

/** Metadata key set by `@HasClaim()`: the claims a caller must hold, checked by `ClaimsGuard`. */
export const REQUIRED_CLAIMS_KEY = 'auth:requiredClaims';

/** Appears in the `WWW-Authenticate` header of every 401 the guards answer. */
export const AUTH_REALM = 'opensurvey';

/**
 * Payload claims that carry a list of permissions, roles or groups. A token
 * "has" a claim when the claim is a key of the payload or an entry in one of
 * these lists; see `hasClaim()` in `claims.ts`.
 */
export const CLAIM_LIST_NAMES = [
  'roles',
  'role',
  'groups',
  'permissions',
  'scope',
  'scp',
] as const;

/**
 * Signature algorithms a token may use. All asymmetric: a JWKS publishes
 * public keys only, so an HMAC token signed with a public key's bytes (the
 * classic algorithm-confusion attack) is refused before any key lookup.
 */
export const ALLOWED_ALGORITHMS: JWSAlgorithm[] = [
  'RS256',
  'RS384',
  'RS512',
  'PS256',
  'PS384',
  'PS512',
  'ES256',
  'ES384',
  'ES512',
  'EdDSA',
];

/** Injection token for the key set `TokenVerifierService` checks signatures with. */
export const AUTH_KEY_SET = 'AUTH_KEY_SET';
