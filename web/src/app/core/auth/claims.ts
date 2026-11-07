/** A decoded JWT payload: standard claims plus whatever the identity provider adds. */
export type Claims = Readonly<Record<string, unknown>>;

/**
 * Claims whose value is a list a claim can be an entry of: JSON arrays
 * (`roles`, `groups`) or space-separated strings (`scope`). Mirrors the API's
 * `CLAIM_LIST_NAMES` in `api/src/auth/auth.constants.ts`.
 */
export const CLAIM_LIST_NAMES: readonly string[] = [
  'roles',
  'role',
  'groups',
  'permissions',
  'scope',
  'scp',
];

/**
 * Whether a token payload holds `claim`, decided exactly as the API's
 * `hasClaim()` in `api/src/auth/claims.ts` decides it, so the console shows
 * the same people the API lets in. True when:
 *
 * - `claim` is a key of the payload with a value other than `false`, `null`
 *   or an empty string (`{ "azg12345_SurveyAdmin": true }`), or
 * - `claim` is an entry of one of the list claims in `CLAIM_LIST_NAMES`,
 *   given as a JSON array (`{ "roles": ["azg12345_SurveyAdmin"] }`) or as a
 *   space-separated string as `scope` is (`{ "scope": "read write" }`).
 */
export function hasClaim(payload: Claims, claim: string): boolean {
  const direct = payload[claim];
  if (direct !== undefined && direct !== null && direct !== false && direct !== '') {
    return true;
  }
  return CLAIM_LIST_NAMES.some((name) => listIncludes(payload[name], claim));
}

function listIncludes(value: unknown, claim: string): boolean {
  if (Array.isArray(value)) return value.includes(claim);
  if (typeof value === 'string') return value.split(' ').includes(claim);
  return false;
}

/**
 * The payload of a JWT, without verifying it: the API verifies the signature,
 * the console only reads claims to decide what to show. Null when the token
 * is not a JWT.
 */
export function decodeJwtPayload(token: string): Claims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return typeof parsed === 'object' && parsed !== null ? (parsed as Claims) : null;
  } catch {
    return null;
  }
}
