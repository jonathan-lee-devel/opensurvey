import type { Environment } from './environment.types';

/**
 * Production configuration, swapped in for `environment.ts` by the production
 * build. The defaults match the compose `app` profile (Keycloak on the host's
 * port 8180). Point `oidc.issuer` and `oidc.clientId` at your own identity
 * provider before building an image for another deployment.
 */
export const environment: Environment = {
  production: true,
  apiBaseUrl: '/api',
  oidc: {
    issuer: 'http://localhost:8180/realms/opensurvey',
    clientId: 'opensurvey-web',
    scope: 'openid profile email',
  },
  adminClaim: 'azg12345_SurveyAdmin',
};
