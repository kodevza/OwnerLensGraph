import { GraphModel } from './GraphModel';
import { IconResolver } from './IconResolver';
import type { Attributes, OwnerLensReport } from './types';
import { asString, normalize, shortId } from './value';

function record(value: unknown): Attributes {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Attributes : {};
}

function records(value: unknown): Attributes[] {
  return Array.isArray(value) ? value.filter((x): x is Attributes => Boolean(x && typeof x === 'object' && !Array.isArray(x))) : [];
}

function prop(obj: Attributes, key: string): unknown {
  return obj[key];
}

export class OwnerLensGraphParser {
  private readonly iconResolver = new IconResolver();

  parse(input: unknown): GraphModel {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Top-level JSON must be an object.');
    const report = input as OwnerLensReport;
    const app = report.enterpriseApplication;
    if (!app) throw new Error('Missing enterpriseApplication in OwnerLens report.');

    const model = new GraphModel(record(report.meta), record(report.summary));
    const resourceByScope = new Map<string, string>();
    const principalByIdentity = new Map<string, string>();

    const rememberPrincipal = (nodeId: string, ...keys: unknown[]) => {
      for (const key of keys) {
        const normalized = normalize(key);
        if (normalized) principalByIdentity.set(normalized, nodeId);
      }
    };

    const findPrincipal = (...keys: unknown[]): string | undefined => {
      for (const key of keys) {
        const found = principalByIdentity.get(normalize(key));
        if (found) return found;
      }
      return undefined;
    };

    const rootIdentity = asString(app.objectId || app.appId || app.displayName);
    if (!rootIdentity) throw new Error('enterpriseApplication needs objectId, appId or displayName.');
    const rootId = `identity:${rootIdentity}`;
    const root = model.upsertNode(
      rootId,
      asString(app.displayName || app.appDisplayName || 'Enterprise Application'),
      asString(app.servicePrincipalType || 'ServicePrincipal'),
      { ...app, reportType: report.meta?.reportType, activityDays: report.meta?.activityDays },
    );
    model.root = root;
    rememberPrincipal(root.id, app.objectId, app.appId, app.displayName);

    const azure = record(report.azure);
    const graph = record(report.graph);

    for (const subscription of records(azure.subscriptions)) {
      const subscriptionId = asString(prop(subscription, 'subscriptionId'));
      if (!subscriptionId) continue;
      model.upsertNode(
        `subscription:${subscriptionId}`,
        asString(prop(subscription, 'subscriptionName') || subscriptionId),
        'Subscription',
        subscription,
      );
    }

    const storageInfo = new Map(
      records(azure.storageAccountsWithRbac).map((entry) => [normalize(prop(entry, 'resourceId')), entry] as const),
    );

    for (const resource of records(azure.resourceDependencies)) {
      const resourceId = asString(prop(resource, 'resourceId'));
      if (!resourceId) continue;
      const nodeId = `resource:${normalize(resourceId)}`;
      const storage = storageInfo.get(normalize(resourceId));
      const attributes: Attributes = { ...resource };
      if (storage) {
        for (const key of [
          'dataPlaneReadServices', 'dataPlaneReadRoleNames', 'diagnosticLogEnabled',
          'diagnosticLogAnalyticsEnabled', 'dataAccessVerificationStatus', 'dataAccessVerificationReason',
        ]) {
          const value = prop(storage, key);
          if (value !== undefined) attributes[key] = value;
        }
      }
      model.upsertNode(
        nodeId,
        asString(prop(resource, 'resourceName') || shortId(resourceId)),
        asString(prop(resource, 'resourceType') || prop(resource, 'dependencyType') || 'Resource'),
        attributes,
      );
      resourceByScope.set(normalize(resourceId), nodeId);

      const match = resourceId.match(/\/subscriptions\/([^/]+)/i);
      if (match) {
        const subscriptionNode = model.nodes.get(`subscription:${match[1]}`);
        if (subscriptionNode) model.addEdge(`contains:${subscriptionNode.id}:${nodeId}`, subscriptionNode, nodeId, 'contains', 'contains');
      }
    }

    const ensureResourceForScope = (scopeValue: unknown) => {
      const scope = asString(scopeValue);
      const normalizedScope = normalize(scope);
      const existingId = resourceByScope.get(normalizedScope);
      if (existingId) return model.requireNode(existingId);
      const nodeId = `scope:${normalizedScope}`;
      const name = scope.split('/').filter(Boolean).at(-1) || shortId(scope);
      const node = model.upsertNode(nodeId, name, 'RBAC scope', { scope });
      resourceByScope.set(normalizedScope, node.id);
      return node;
    };

    for (const assignment of records(azure.roleAssignments)) {
      const target = ensureResourceForScope(prop(assignment, 'scope'));
      const roleAssignmentId = asString(prop(assignment, 'roleAssignmentId')) || `${root.id}:${target.id}:${asString(prop(assignment, 'roleDefinitionName'))}`;
      model.addEdge(`rbac:${roleAssignmentId}`, root, target, asString(prop(assignment, 'roleDefinitionName') || 'RBAC'), 'RBAC', assignment);
    }

    for (const candidate of records(azure.coAssignedRoleCandidates)) {
      const principalKey = prop(candidate, 'principalId') || prop(candidate, 'principalName') || prop(candidate, 'principalDisplayName');
      const key = asString(principalKey || 'unknown');
      const nodeId = `principal:${normalize(key)}`;
      const node = model.upsertNode(
        nodeId,
        asString(prop(candidate, 'principalDisplayName') || prop(candidate, 'principalName') || shortId(key)),
        asString(prop(candidate, 'principalType') || 'Principal'),
        candidate,
      );
      rememberPrincipal(node.id, prop(candidate, 'principalId'), prop(candidate, 'principalName'), prop(candidate, 'principalDisplayName'));
      const target = ensureResourceForScope(prop(candidate, 'scope'));
      const roleAssignmentId = asString(prop(candidate, 'roleAssignmentId')) || `${node.id}:${target.id}`;
      model.addEdge(`corbac:${roleAssignmentId}`, node, target, asString(prop(candidate, 'roleDefinitionName') || 'co-RBAC'), 'co-RBAC', candidate);
    }

    for (const caller of records(azure.rbacScopeActivityCallers)) {
      let nodeId = findPrincipal(prop(caller, 'callerObjectId'), prop(caller, 'caller'), prop(caller, 'callerName'));
      if (!nodeId) {
        const key = asString(prop(caller, 'callerObjectId') || prop(caller, 'caller') || prop(caller, 'callerName') || prop(caller, 'callerKey'));
        nodeId = `caller:${normalize(key)}`;
        const node = model.upsertNode(nodeId, asString(prop(caller, 'callerName') || prop(caller, 'caller') || shortId(key)), 'Activity caller', caller);
        rememberPrincipal(node.id, prop(caller, 'callerObjectId'), prop(caller, 'caller'), prop(caller, 'callerName'));
      } else {
        model.requireNode(nodeId).merge(null, null, { activity: caller });
      }
      const node = model.requireNode(nodeId);
      const scopes = recordsAsUnknown(prop(caller, 'resourceIds')).length
        ? recordsAsUnknown(prop(caller, 'resourceIds'))
        : recordsAsUnknown(prop(caller, 'rbacScopes'));
      for (const scope of scopes) {
        const target = ensureResourceForScope(scope);
        model.addEdge(
          `activity:${node.id}:${target.id}`,
          node,
          target,
          `${asString(prop(caller, 'eventCount') || '?')} activity events`,
          'activity',
          caller,
        );
      }
    }

    for (const owner of records(graph.owners)) {
      const key = prop(owner, 'id') || prop(owner, 'objectId') || prop(owner, 'userPrincipalName') || prop(owner, 'displayName');
      const keyText = asString(key || 'unknown');
      const nodeId = findPrincipal(key, prop(owner, 'userPrincipalName'), prop(owner, 'displayName')) || `owner:${normalize(keyText)}`;
      const ownerType = asString(prop(owner, '@odata.type')).toLowerCase().includes('group') ? 'Group owner' : 'User owner';
      const node = model.upsertNode(nodeId, asString(prop(owner, 'displayName') || prop(owner, 'userPrincipalName') || shortId(keyText)), ownerType, owner);
      rememberPrincipal(node.id, key, prop(owner, 'userPrincipalName'), prop(owner, 'displayName'));
      model.addEdge(`owner:${node.id}:${root.id}`, node, root, 'explicit owner', 'owner', owner);
    }

    for (const candidate of records(report.ownerCandidates)) {
      const candidateKey = prop(candidate, 'candidate');
      const nodeId = findPrincipal(candidateKey) || `candidate:${normalize(candidateKey)}`;
      const node = model.upsertNode(
        nodeId,
        asString(candidateKey || shortId(nodeId)),
        `${asString(prop(candidate, 'candidateType') || 'Principal')} candidate`,
        { ...candidate, ownerCandidate: true },
      );
      rememberPrincipal(node.id, candidateKey);

      const evidenceId = prop(candidate, 'evidenceId') || prop(candidate, 'evidenceSource');
      const targetId = resourceByScope.get(normalize(evidenceId));
      if (targetId) {
        model.addEdge(
          `candidate-evidence:${node.id}:${targetId}:${asString(prop(candidate, 'signal'))}`,
          node,
          targetId,
          `${asString(prop(candidate, 'signal') || 'evidence')} · ${asString(prop(candidate, 'confidence') || '?')}`,
          'candidate-evidence',
          candidate,
        );
      }
    }

    for (const node of model.nodes.values()) node.icon = this.iconResolver.resolve(node, model.root?.id);
    return model;
  }
}

function recordsAsUnknown(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
