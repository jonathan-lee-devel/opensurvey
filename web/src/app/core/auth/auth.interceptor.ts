import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthStore } from './auth.store';

/**
 * Adds the Bearer token to calls to the API's protected routes. Public
 * routes (`/public/...`) are left anonymous, as are requests to anything
 * other than the API, so the token never travels to a third party.
 */
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const protectedPrefix = `${environment.apiBaseUrl}/`;
  const publicPrefix = `${environment.apiBaseUrl}/public/`;
  if (!request.url.startsWith(protectedPrefix) || request.url.startsWith(publicPrefix)) {
    return next(request);
  }
  const token = inject(AuthStore).accessToken();
  if (!token) {
    return next(request);
  }
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
