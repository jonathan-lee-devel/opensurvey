import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TestBed } from '@suites/unit';

import type { AuthenticatedUser } from '../auth.types.js';
import { ClaimsGuard } from './claims.guard.js';

function handler() {}
class Ctrl {}

const contextWith = (user: AuthenticatedUser | undefined) =>
  ({
    getHandler: () => handler,
    getClass: () => Ctrl,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const admin: AuthenticatedUser = {
  subject: 'u1',
  claims: { sub: 'u1', roles: ['azg12345_SurveyAdmin'], scope: 'openid' },
};

async function build(required: string[]) {
  const { unit } = await TestBed.solitary(ClaimsGuard)
    .mock(Reflector)
    .impl((stub) => ({ getAllAndMerge: stub().mockReturnValue(required) }))
    .compile();
  return unit;
}

describe('ClaimsGuard', () => {
  it('passes a route without @HasClaim(), caller or not', async () => {
    const guard = await build([]);
    expect(guard.canActivate(contextWith(undefined))).toBe(true);
    expect(guard.canActivate(contextWith(admin))).toBe(true);
  });

  it('passes a caller holding every required claim', async () => {
    const guard = await build(['azg12345_SurveyAdmin', 'openid']);
    expect(guard.canActivate(contextWith(admin))).toBe(true);
  });

  it('answers 403 naming the claims the caller lacks', async () => {
    const guard = await build(['azg12345_SurveyAdmin', 'azg12345_Billing']);
    expect(() => guard.canActivate(contextWith(admin))).toThrow(
      new ForbiddenException('Missing required claim: azg12345_Billing'),
    );
    const guard2 = await build(['a', 'b']);
    expect(() => guard2.canActivate(contextWith(admin))).toThrow(
      'Missing required claims: a, b',
    );
  });

  it('answers 401 when no caller was authenticated', async () => {
    const guard = await build(['azg12345_SurveyAdmin']);
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  it("merges the controller's claims with the handler's", async () => {
    const { unit, unitRef } = await TestBed.solitary(ClaimsGuard)
      .mock(Reflector)
      .impl((stub) => ({ getAllAndMerge: stub().mockReturnValue([]) }))
      .compile();
    const context = contextWith(admin);
    unit.canActivate(context);
    expect(unitRef.get(Reflector).getAllAndMerge).toHaveBeenCalledWith(
      'auth:requiredClaims',
      [context.getClass(), context.getHandler()],
    );
  });
});
