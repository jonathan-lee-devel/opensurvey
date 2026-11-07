/**
 * Build-time configuration shape shared by `environment.ts` and
 * `environment.production.ts` (which replaces it in production builds, see
 * `fileReplacements` in angular.json; self-hosters edit that one to point the
 * console at their own identity provider).
 */
export interface Environment {
  readonly production: boolean;
  /**
   * Where the API is reached from the browser, without a trailing slash.
   * Relative on purpose: `ng serve` proxies it to the API (proxy.conf.json) and
   * the nginx in the web container does the same in Docker (nginx.conf).
   */
  readonly apiBaseUrl: string;
  readonly oidc: {
    /** The OpenID Connect issuer; its discovery document is fetched from here. */
    readonly issuer: string;
    /** A public client with PKCE enabled and this app's origin among its redirect URIs. */
    readonly clientId: string;
    readonly scope: string;
  };
  /**
   * The claim a signed-in user must hold to use the console. Checked the way
   * the API's `@HasClaim()` checks it: a truthy key of the token, or an entry
   * of its `roles`, `groups`, `permissions` or space-separated `scope` claim.
   */
  readonly adminClaim: string;
}
