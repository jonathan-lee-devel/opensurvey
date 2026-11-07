import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TestBed } from '@suites/unit';

import type { AuthenticatedRequest, AuthenticatedUser } from '../auth.types.js';
import { TokenVerifierService } from '../services/token-verifier/token-verifier.service.js';
import { AuthGuard, bearerToken } from './auth.guard.js';

const user: AuthenticatedUser = { subject: 'u1', claims: { sub: 'u1' } };
function handler() {}
class Ctrl {}

function contextFor(authorization?: string) {
  const request = { headers: { authorization } } as AuthenticatedRequest;
  const response = { setHeader: vi.fn() };
  const context = {
    getHandler: () => handler,
    getClass: () => Ctrl,
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
  return { context, request, response };
}

async function build(isPublic: boolean | undefined, verifyError?: Error) {
  return TestBed.solitary(AuthGuard)
    .mock(Reflector)
    .impl((stub) => ({
      getAllAndOverride: stub().mockReturnValue(isPublic),
    }))
    .mock(TokenVerifierService)
    .impl((stub) => ({
      verify: verifyError
        ? stub().mockRejectedValue(verifyError)
        : stub().mockResolvedValue(user),
    }))
    .compile();
}

describe('AuthGuard', () => {
  it('lets an @IsPublic() route through without reading the header', async () => {
    const { unit, unitRef } = await build(true);
    const { context, request } = contextFor(undefined);
    await expect(unit.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBeUndefined();
    expect(unitRef.get(TokenVerifierService).verify).not.toHaveBeenCalled();
  });

  it('verifies the Bearer token and attaches the user', async () => {
    const { unit, unitRef } = await build(undefined);
    const { context, request } = contextFor('Bearer abc.def.ghi');
    await expect(unit.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBe(user);
    expect(unitRef.get(TokenVerifierService).verify).toHaveBeenCalledWith(
      'abc.def.ghi',
    );
  });

  it('answers 401 with a WWW-Authenticate challenge when the header is missing', async () => {
    const { unit, unitRef } = await build(undefined);
    const { context, response } = contextFor(undefined);
    await expect(unit.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing Bearer token'),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer realm="opensurvey"',
    );
    expect(unitRef.get(TokenVerifierService).verify).not.toHaveBeenCalled();
  });

  it('treats a non-Bearer Authorization header as missing', async () => {
    const { unit } = await build(undefined);
    const { context } = contextFor('Basic dXNlcjpwYXNz');
    await expect(unit.canActivate(context)).rejects.toThrow(
      'Missing Bearer token',
    );
  });

  it("passes the verifier's 401 on, flagged invalid_token", async () => {
    const error = new UnauthorizedException('Token has expired');
    const { unit } = await build(undefined, error);
    const { context, response, request } = contextFor('Bearer expired');
    await expect(unit.canActivate(context)).rejects.toBe(error);
    expect(response.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'Bearer realm="opensurvey", error="invalid_token"',
    );
    expect(request.user).toBeUndefined();
  });

  it('checks the handler before the class', async () => {
    const { unit, unitRef } = await build(true);
    const { context } = contextFor(undefined);
    await unit.canActivate(context);
    expect(unitRef.get(Reflector).getAllAndOverride).toHaveBeenCalledWith(
      'auth:isPublic',
      [context.getHandler(), context.getClass()],
    );
  });
});

describe('bearerToken', () => {
  it.each([
    ['Bearer abc', 'abc'],
    ['bearer abc', 'abc'],
    ['  Bearer   abc  ', 'abc'],
    ['Bearer', undefined],
    ['Bearer a b', undefined],
    ['Basic abc', undefined],
    [undefined, undefined],
  ])('%j -> %j', (header, expected) => {
    expect(bearerToken(header)).toBe(expected);
  });
});
