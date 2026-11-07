import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** What the API records about the request that carried a public write. */
export interface ClientMetadata {
  /** Express's `req.ip`, which honours TRUST_PROXY; null when unknown. */
  ipAddress: string | null;
  userAgent: string | null;
  referer: string | null;
}

/** Reads the metadata off an Express request; `@ClientMetadata()` wraps it. */
export function clientMetadataFrom(req: Request): ClientMetadata {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
    referer: req.get('referer') ?? null,
  };
}

/**
 * Parameter decorator handing a handler the client's IP address, user agent
 * and referer, so the controller stays free of request plumbing.
 *
 * @example
 * create(@Body({ schema }) dto: Dto, @ClientMetadata() client: ClientMetadata) {}
 */
export const ClientMetadata = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ClientMetadata =>
    clientMetadataFrom(ctx.switchToHttp().getRequest<Request>()),
);
