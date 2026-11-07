import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { LOGIN_REDIRECT_PATH } from './auth.config';
import { AuthStore } from './auth.store';

/**
 * Lets only signed-in holders of the admin claim into the console. Anyone
 * else is sent to sign in (and brought back to the URL they asked for), or
 * to `/forbidden` when they are signed in without the claim.
 *
 * Right after a sign-in the browser arrives on the redirect URI with
 * leftovers from the identity provider in the query string (`iss`, and
 * `session_state` on some providers); the guard then redirects to the URL the
 * user originally asked for, which also drops those parameters.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    void auth.login(state.url);
    return false;
  }
  if (!auth.isAdmin()) {
    return router.createUrlTree(['/forbidden']);
  }
  const returnUrl = auth.consumeReturnUrl();
  const justSignedIn = route.queryParamMap.has('iss') || route.queryParamMap.has('session_state');
  if (returnUrl !== null && returnUrl !== state.url) {
    return router.parseUrl(returnUrl);
  }
  if (justSignedIn) {
    return router.parseUrl(returnUrl ?? LOGIN_REDIRECT_PATH);
  }
  return true;
};
