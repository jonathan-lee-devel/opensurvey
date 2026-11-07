import type { JWTPayload } from 'jose';

import { CLAIM_LIST_NAMES } from './auth.constants.js';

/**
 * Whether a token payload holds `claim`. True when:
 *
 * - `claim` is a key of the payload with a value other than `false`, `null`
 *   or an empty string (`{ "azg12345_SurveyAdmin": true }`), or
 * - `claim` is an entry of one of the list claims in `CLAIM_LIST_NAMES`,
 *   given as a JSON array (`{ "roles": ["azg12345_SurveyAdmin"] }`) or as a
 *   space-separated string as `scope` is (`{ "scope": "read write" }`).
 */
export function hasClaim(payload: JWTPayload, claim: string): boolean {
  const direct = payload[claim];
  if (direct !== undefined && direct !== null && direct !== false) {
    if (direct !== '') return true;
  }
  return CLAIM_LIST_NAMES.some((name) => listIncludes(payload[name], claim));
}

function listIncludes(value: unknown, claim: string): boolean {
  if (Array.isArray(value)) return value.includes(claim);
  if (typeof value === 'string') return value.split(' ').includes(claim);
  return false;
}
