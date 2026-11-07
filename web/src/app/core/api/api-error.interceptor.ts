import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthStore } from '../auth/auth.store';
import { ApiError } from './api-error';

/**
 * Normalises failures from the API into `ApiError`s and sends the user back to
 * the identity provider on a 401 (an expired or revoked session). Requests to
 * anything else, such as the identity provider itself, pass through untouched.
 */
export const apiErrorInterceptor: HttpInterceptorFn = (request, next) => {
  if (!isApiRequest(request.url)) {
    return next(request);
  }
  const auth = inject(AuthStore);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse)) {
        return throwError(() => error);
      }
      const apiError = ApiError.fromResponse(error);
      if (apiError.status === 401) {
        auth.login();
      }
      return throwError(() => apiError);
    }),
  );
};

export function isApiRequest(url: string): boolean {
  return url.startsWith(`${environment.apiBaseUrl}/`);
}
