const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
);

export const KEYCLOAK_URL = trimTrailingSlash(
  import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080'
);

export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM || 'myrealm';
export const KEYCLOAK_CLIENT_ID =
  import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'frontend-app';
