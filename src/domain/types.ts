export type Attributes = Record<string, unknown>;

export interface OwnerLensReport {
  meta?: Attributes;
  enterpriseApplication?: Attributes & {
    objectId?: string | null;
    applicationObjectId?: string | null;
    appId?: string | null;
    displayName?: string | null;
    appDisplayName?: string | null;
    servicePrincipalType?: string | null;
  };
  azure?: {
    subscriptions?: Attributes[];
    roleAssignments?: Attributes[];
    coAssignedRoleCandidates?: Attributes[];
    resourceDependencies?: Attributes[];
    activityEvidence?: Attributes[];
    rbacScopeActivityEvidence?: Attributes[];
    rbacScopeActivityCallers?: Attributes[];
    storageAccountsWithRbac?: Attributes[];
    [key: string]: unknown;
  };
  graph?: {
    owners?: Attributes[];
    appRoleAssignments?: Attributes[];
    oauth2PermissionGrants?: Attributes[];
    memberOf?: Attributes[];
    resourceServicePrincipals?: Attributes[];
    userSignIns?: Attributes[];
    [key: string]: unknown;
  };
  ownerCandidates?: Attributes[];
  summary?: Attributes;
  notes?: unknown[];
  [key: string]: unknown;
}
