import { AuthConfig } from 'angular-oauth2-oidc';

import { environment } from '../../../environments/environment';

/** Where the identity provider sends the browser back to after sign-in. */
export const LOGIN_REDIRECT_PATH = '/admin';

/**
 * Authorization code flow with PKCE against the issuer in `environment.ts`.
 * `origin` is the app's own origin (`http://localhost:4200` in development),
 * which must be among the client's redirect URIs at the identity provider.
 */
export function buildAuthConfig(origin: string): AuthConfig {
  return {
    issuer: environment.oidc.issuer,
    clientId: environment.oidc.clientId,
    scope: environment.oidc.scope,
    responseType: 'code',
    redirectUri: `${origin}${LOGIN_REDIRECT_PATH}`,
    postLogoutRedirectUri: `${origin}/`,
    // Plain http is only acceptable for a development issuer on localhost.
    requireHttps: 'remoteOnly',
    showDebugInformation: !environment.production,
    // Keycloak's discovery document lists endpoints under the issuer, so the
    // default strict check passes; keep it on so a misconfigured issuer fails
    // loudly instead of talking to the wrong server.
    strictDiscoveryDocumentValidation: true,
    clearHashAfterLogin: true,
  };
}
