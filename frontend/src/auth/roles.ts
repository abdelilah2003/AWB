import type { KeycloakInstance } from 'keycloak-js';

export type UserRole = 'secops_engineer' | 'manager' | 'admin';

const SUPPORTED_ROLES: UserRole[] = ['secops_engineer', 'manager', 'admin'];

const dedupe = (roles: string[]) => Array.from(new Set(roles));

export function getUserRoles(keycloak: KeycloakInstance): string[] {
  const tokenParsed = keycloak.tokenParsed;
  if (!tokenParsed) {
    return [];
  }

  const realmRoles = tokenParsed.realm_access?.roles ?? [];
  const clientRoles = Object.values(tokenParsed.resource_access ?? {}).flatMap(
    (access) => access.roles ?? []
  );

  return dedupe([...realmRoles, ...clientRoles]);
}

export function resolveUserRole(keycloak: KeycloakInstance): UserRole | null {
  const roles = getUserRoles(keycloak);

  for (const role of SUPPORTED_ROLES) {
    if (roles.includes(role)) {
      return role;
    }
  }

  return null;
}

export function hasRole(keycloak: KeycloakInstance, role: UserRole): boolean {
  return getUserRoles(keycloak).includes(role);
}
