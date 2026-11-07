import type { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';

import type { AuthenticatedUser } from '../auth.types.js';
import { CurrentUser } from './current-user.decorator.js';

// createParamDecorator stores its factory in the route-args metadata; this
// digs it out so the test can call it with a fake context, the way Nest does.
function factoryOf(decorator: ParameterDecorator) {
  class Target {
    handler(_user?: AuthenticatedUser) {}
  }
  decorator(Target.prototype, 'handler', 0);
  const args = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Target,
    'handler',
  ) as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;
  return Object.values(args)[0].factory;
}

const contextWith = (user: AuthenticatedUser | undefined) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('CurrentUser', () => {
  it('hands the handler the user AuthGuard attached', () => {
    const user: AuthenticatedUser = { subject: 'u1', claims: { sub: 'u1' } };
    expect(factoryOf(CurrentUser())(undefined, contextWith(user))).toBe(user);
  });

  it('is undefined on a public route', () => {
    expect(
      factoryOf(CurrentUser())(undefined, contextWith(undefined)),
    ).toBeUndefined();
  });
});
