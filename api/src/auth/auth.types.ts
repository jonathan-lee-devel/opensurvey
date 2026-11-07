import type { Request } from 'express';
import type { JWTPayload } from 'jose';

/** The caller `AuthGuard` attaches to the request once its token is verified. */
export interface AuthenticatedUser {
  /** The token's `sub` claim: the identity provider's stable id for the caller. */
  subject: string;
  /** Every claim in the token's payload, `sub`, `iss`, `exp` and the custom ones included. */
  claims: JWTPayload;
}

/** An Express request after `AuthGuard` ran; `user` is absent on `@IsPublic()` routes. */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}
