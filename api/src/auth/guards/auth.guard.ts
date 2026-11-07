import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';

import { AUTH_REALM, IS_PUBLIC_KEY } from '../auth.constants.js';
import type { AuthenticatedRequest } from '../auth.types.js';
import { TokenVerifierService } from '../services/token-verifier/token-verifier.service.js';

/**
 * Global guard (APP_GUARD in `AuthModule`): every route needs an
 * `Authorization: Bearer <JWT>` header that `TokenVerifierService` accepts,
 * unless the handler or its controller is marked `@IsPublic()`. On success the
 * caller is attached as `request.user`, for `@CurrentUser()` and
 * `ClaimsGuard`; on failure the 401 carries a `WWW-Authenticate` header as
 * RFC 6750 asks.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenVerifierService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isPublic === true) return true;

    const http = context.switchToHttp();
    const request = http.getRequest<AuthenticatedRequest>();
    const response = http.getResponse<Response>();

    const token = bearerToken(request.headers.authorization);
    if (token === undefined) {
      response.setHeader('WWW-Authenticate', `Bearer realm="${AUTH_REALM}"`);
      throw new UnauthorizedException('Missing Bearer token');
    }
    try {
      request.user = await this.tokens.verify(token);
    } catch (error) {
      response.setHeader(
        'WWW-Authenticate',
        `Bearer realm="${AUTH_REALM}", error="invalid_token"`,
      );
      throw error;
    }
    return true;
  }
}

/** The token from an `Authorization: Bearer <token>` header, or undefined for anything else. */
export function bearerToken(header: string | undefined): string | undefined {
  if (header === undefined) return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1];
}
