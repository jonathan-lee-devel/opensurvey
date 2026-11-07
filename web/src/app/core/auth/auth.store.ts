import { DOCUMENT } from '@angular/common';
import { DestroyRef, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { OAuthService } from 'angular-oauth2-oidc';

import { environment } from '../../../environments/environment';
import { ToastsStore } from '../stores/toasts.store';
import { buildAuthConfig } from './auth.config';
import { Claims, decodeJwtPayload, hasClaim } from './claims';

export type AuthStatus = 'initializing' | 'anonymous' | 'authenticated';

export interface AuthProfile {
  readonly subject: string;
  readonly name: string;
  readonly email: string | null;
}

interface AuthState {
  readonly status: AuthStatus;
  /** Claims of the access token over those of the id token; empty when signed out. */
  readonly claims: Claims;
  readonly accessToken: string | null;
  /** Where the user was heading before being sent to sign in; consumed by the admin guard. */
  readonly returnUrl: string | null;
}

const initialState: AuthState = {
  status: 'initializing',
  claims: {},
  accessToken: null,
  returnUrl: null,
};

/** Events after which the tokens, and so the claims, may have changed. */
const TOKEN_EVENTS: ReadonlySet<string> = new Set([
  'token_received',
  'token_refreshed',
  'token_expires',
  'token_error',
  'token_refresh_error',
  'session_terminated',
  'logout',
]);

/**
 * Who is signed in, read from `angular-oauth2-oidc`. `init()` runs once at
 * startup (an app initializer) and finishes the code flow when the identity
 * provider has just redirected back; afterwards the state follows the
 * library's events, so a silent refresh or a sign-out shows up here too.
 */
export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ status, claims }) => ({
    isAuthenticated: computed(() => status() === 'authenticated'),
    isAdmin: computed(() => hasClaim(claims(), environment.adminClaim)),
    profile: computed((): AuthProfile | null => {
      const payload = claims();
      const subject = payload['sub'];
      if (typeof subject !== 'string') return null;
      return {
        subject,
        name:
          firstString(payload['name'], payload['preferred_username'], payload['email']) ?? subject,
        email: firstString(payload['email']),
      };
    }),
  })),
  withMethods((store) => {
    const oauth = inject(OAuthService);
    const toasts = inject(ToastsStore);
    const document = inject(DOCUMENT);
    const destroyRef = inject(DestroyRef);

    const syncFromLibrary = (): void => {
      if (oauth.hasValidAccessToken()) {
        const accessToken = oauth.getAccessToken();
        patchState(store, {
          status: 'authenticated',
          accessToken,
          claims: { ...oauth.getIdentityClaims(), ...decodeJwtPayload(accessToken) },
        });
      } else {
        patchState(store, { status: 'anonymous', accessToken: null, claims: {} });
      }
    };

    const ensureDiscovery = async (): Promise<void> => {
      if (!oauth.discoveryDocumentLoaded) {
        await oauth.loadDiscoveryDocument();
      }
    };

    return {
      /** Configures the client and completes a pending sign-in; never throws. */
      async init(): Promise<void> {
        const origin = document.defaultView?.location.origin ?? '';
        oauth.configure(buildAuthConfig(origin));
        oauth.events.pipe(takeUntilDestroyed(destroyRef)).subscribe((event) => {
          if (TOKEN_EVENTS.has(event.type)) syncFromLibrary();
        });
        try {
          await oauth.loadDiscoveryDocumentAndTryLogin();
          oauth.setupAutomaticSilentRefresh();
        } catch (error) {
          console.error('Sign-in could not be initialised', error);
        }
        syncFromLibrary();
        // The route the user asked for before being sent to sign in travels
        // in the OAuth `state` parameter and comes back decoded here. The
        // admin guard navigates there once the router is up (navigating from
        // an app initializer would race the router's own first navigation).
        const returnUrl = decodeState(oauth.state);
        oauth.state = undefined;
        if (store.status() === 'authenticated' && returnUrl?.startsWith('/')) {
          patchState(store, { returnUrl });
        }
      },

      /** The URL a just-finished sign-in should land on, once; null afterwards. */
      consumeReturnUrl(): string | null {
        const returnUrl = store.returnUrl();
        if (returnUrl !== null) patchState(store, { returnUrl: null });
        return returnUrl;
      },

      /** Sends the browser to the identity provider; `returnUrl` is restored after. */
      async login(returnUrl?: string): Promise<void> {
        try {
          await ensureDiscovery();
          oauth.initCodeFlow(returnUrl);
        } catch (error) {
          console.error('Could not start sign-in', error);
          toasts.error('The identity provider could not be reached. Try again in a moment.');
        }
      },

      /** Revokes the tokens and signs out at the identity provider too. */
      async logout(): Promise<void> {
        try {
          await oauth.revokeTokenAndLogout();
        } catch (error) {
          console.error('Sign-out failed', error);
          oauth.logOut(true);
        }
        syncFromLibrary();
      },
    };
  }),
);

/** The library hands back the `state` it sent still URL-encoded; undo that, tolerating junk. */
function decodeState(state: string | undefined): string | null {
  if (!state) return null;
  try {
    return decodeURIComponent(state);
  } catch {
    return null;
  }
}

function firstString(...values: readonly unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}
