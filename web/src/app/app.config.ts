import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideOAuthClient } from 'angular-oauth2-oidc';

import { routes } from './app.routes';
import { apiErrorInterceptor } from './core/api/api-error.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthStore } from './core/auth/auth.store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // authInterceptor runs first on the way out (adds the token) and
    // apiErrorInterceptor sees the response first on the way back.
    provideHttpClient(withInterceptors([authInterceptor, apiErrorInterceptor])),
    provideOAuthClient(),
    // Finishes a sign-in redirect before the router makes its first navigation,
    // so the admin guard already knows who is signed in.
    provideAppInitializer(() => inject(AuthStore).init()),
  ],
};
