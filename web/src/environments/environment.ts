import type { Environment } from './environment.types';

/** Development configuration: the compose `infrastructure` profile's Keycloak and `ng serve`'s proxy. */
export const environment: Environment = {
  production: false,
  apiBaseUrl: '/api',
  oidc: {
    issuer: 'http://localhost:8180/realms/opensurvey',
    clientId: 'opensurvey-web',
    scope: 'openid profile email',
  },
  adminClaim: 'azg12345_SurveyAdmin',
};
