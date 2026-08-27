import type { GraphNode } from './GraphNode';

export class IconResolver {
  static readonly icons = {
    managedIdentity: '/icons/azure/identity/10227-icon-service-Entra-Managed-Identities.svg',
    enterpriseApplication: '/icons/azure/identity/10225-icon-service-Enterprise-Applications.svg',
    storageAccount: '/icons/azure/storage/10086-icon-service-Storage-Accounts.svg',
    user: '/icons/azure/identity/10230-icon-service-Users.svg',
    group: '/icons/azure/identity/10223-icon-service-Groups.svg',
    subscription: '/icons/azure/general/10002-icon-service-Subscriptions.svg',
    resourceGroup: '/icons/azure/general/10007-icon-service-Resource-Groups.svg',
    agent: '/icons/azure/ai + machine learning/038470523-icon-service-Foundry-Agent-Service.svg',
    allResources: '/icons/azure/general/10001-icon-service-All-Resources.svg',
    functionApp: '/icons/azure/compute/10029-icon-service-Function-Apps.svg',
    keyVault: '/icons/azure/security/10245-icon-service-Key-Vaults.svg'
  } as const;

  resolve(node: GraphNode, rootId?: string): string {
    const kind = node.kind.toLowerCase();
    const principalType = String(node.attributes.principalType ?? node.attributes.candidateType ?? '').toLowerCase();
    const resourceType = String(node.attributes.resourceType ?? '').toLowerCase();
    const servicePrincipalType = String(node.attributes.servicePrincipalType ?? '').toLowerCase();

    if (kind.includes('agentidentity') || kind.includes('agent identity') || kind === 'agent') return IconResolver.icons.agent;
    if (kind.includes('managedidentity') || kind.includes('managed identity')) return IconResolver.icons.managedIdentity;
    if (node.id === rootId && servicePrincipalType.includes('managedidentity')) return IconResolver.icons.managedIdentity;
    if (kind.includes('subscription')) return IconResolver.icons.subscription;
    if (kind.includes('group') || principalType === 'group') return IconResolver.icons.group;
    if (kind.includes('user') || kind.includes('caller') || principalType === 'user') return IconResolver.icons.user;
    if (resourceType.includes('microsoft.storage/storageaccounts') || kind.includes('storage')) return IconResolver.icons.storageAccount;
    if (resourceType.includes('microsoft.web/sites') || kind.includes('function app')) return IconResolver.icons.functionApp;
    if (resourceType.includes('microsoft.keyvault/vaults') || kind.includes('key vault')) return IconResolver.icons.keyVault;
    if (kind.includes('resource group') || kind.includes('rbac scope')) return IconResolver.icons.resourceGroup;
    if (kind.includes('serviceprincipal') || kind.includes('service principal') || kind.includes('enterprise application') || principalType === 'serviceprincipal') {
      return IconResolver.icons.enterpriseApplication;
    }
    if (kind.includes('principal') || kind.includes('owner') || kind.includes('candidate')) return IconResolver.icons.enterpriseApplication;
    return IconResolver.icons.allResources;
  }
}
