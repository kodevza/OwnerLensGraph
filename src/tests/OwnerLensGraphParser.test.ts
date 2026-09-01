import { GraphEdge, GraphNode, HierarchicalLayout, IconResolver, OwnerLensGraphParser } from '../domain';

const sample = {
  meta: { reportType: 'enterpriseApplicationDependencies', activityDays: 30 },
  enterpriseApplication: {
    objectId: 'example-managed-identity-id',
    appId: 'example-app-id',
    displayName: 'example-managed-identity',
    servicePrincipalType: 'ManagedIdentity',
  },
  azure: {
    subscriptions: [{ subscriptionId: 'example-subscription', subscriptionName: 'Example subscription' }],
    resourceDependencies: Array.from({ length: 4 }, (_, index) => ({
      resourceId: `/subscriptions/example-subscription/resourceGroups/example-rg/providers/Microsoft.Storage/storageAccounts/example-storage-${index + 1}`,
      resourceName: `example-storage-${index + 1}`,
      resourceType: 'Microsoft.Storage/storageAccounts',
    })),
    roleAssignments: Array.from({ length: 4 }, (_, index) => ({
      roleAssignmentId: `example-role-assignment-${index + 1}`,
      scope: `/subscriptions/example-subscription/resourceGroups/example-rg/providers/Microsoft.Storage/storageAccounts/example-storage-${index + 1}`,
      roleDefinitionName: 'Storage Blob Data Reader',
    })),
    coAssignedRoleCandidates: [
      {
        roleAssignmentId: 'unknown-assignment',
        scope: '/subscriptions/example-subscription/resourceGroups/example-rg/providers/Microsoft.Storage/storageAccounts/example-storage-1',
        principalId: 'unknown-principal',
        principalType: 'Unknown',
        roleDefinitionName: 'Storage Queue Data Contributor',
      },
      {
        roleAssignmentId: 'human-assignment',
        scope: '/subscriptions/example-subscription/resourceGroups/example-rg/providers/Microsoft.Storage/storageAccounts/example-storage-1',
        principalId: 'example-human-id',
        principalType: 'User',
        principalDisplayName: 'Example User',
        roleDefinitionName: 'Storage Queue Data Contributor',
      },
    ],
    rbacScopeActivityCallers: [{
      callerObjectId: 'example-human-id',
      callerName: 'Example User',
      resourceIds: ['/subscriptions/example-subscription/resourceGroups/example-rg/providers/Microsoft.Storage/storageAccounts/example-storage-1'],
      eventCount: 1,
    }],
  },
  graph: { owners: [] },
  ownerCandidates: [{
    candidate: 'example-human-id',
    candidateType: 'User',
    confidence: 'MED',
    signal: 'co-assigned RBAC',
    evidenceId: '/subscriptions/example-subscription/resourceGroups/example-rg/providers/Microsoft.Storage/storageAccounts/example-storage-1',
  }],
};

describe('OwnerLensGraphParser', () => {
  test('creates real GraphNode and GraphEdge objects', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    expect(model.root).toBeInstanceOf(GraphNode);
    expect([...model.nodes.values()].every((node) => node instanceof GraphNode)).toBe(true);
    expect([...model.edges.values()].every((edge) => edge instanceof GraphEdge)).toBe(true);
  });

  test('parses the managed identity as root', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    expect(model.root?.label).toBe('example-managed-identity');
    expect(model.root?.kind).toBe('ManagedIdentity');
    expect(model.root?.attributes.appId).toBe('example-app-id');
    expect(model.root?.icon).toBe(IconResolver.icons.managedIdentity);
  });

  test('creates four storage resource nodes', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    const storage = [...model.nodes.values()].filter((node) => String(node.attributes.resourceType ?? '').toLowerCase() === 'microsoft.storage/storageaccounts');
    expect(storage).toHaveLength(4);
    expect(storage.every((node) => node.icon === IconResolver.icons.storageAccount)).toBe(true);
  });

  test('marks principals reported as Unknown as unknown graph objects', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    const unknown = [...model.nodes.values()].filter((node) => node.isUnknown);
    expect(unknown.length).toBeGreaterThan(0);
    expect(unknown.every((node) => String(node.attributes.principalType).toLowerCase() === 'unknown')).toBe(true);
  });

  test('creates four RBAC edges from the inspected identity', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    const rbac = [...model.edges.values()].filter((edge) => edge.kind === 'RBAC');
    expect(rbac).toHaveLength(4);
    expect(rbac.every((edge) => edge.source === model.root)).toBe(true);
  });

  test('reuses the human principal object when owner-candidate evidence refers to the same user', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    const human = [...model.nodes.values()].find((node) => node.attributes.principalDisplayName === 'Example User');
    expect(human).toBeInstanceOf(GraphNode);
    expect(human?.attributes.ownerCandidate).toBe(true);
    expect(human?.attributes.confidence).toBe('MED');
    expect(human?.icon).toBe(IconResolver.icons.user);
  });

  test('does not invent an explicit owner edge from ownerCandidates', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    expect([...model.edges.values()].filter((edge) => edge.kind === 'owner')).toHaveLength(0);
    expect([...model.edges.values()].some((edge) => edge.kind === 'candidate-evidence')).toBe(true);
  });

  test('merges recent activity into the existing human node instead of duplicating it', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    const matches = [...model.nodes.values()].filter((node) => node.attributes.principalDisplayName === 'Example User');
    expect(matches).toHaveLength(1);
    expect(matches[0].attributes.activity).toBeDefined();
  });

  test('provides object-oriented graph navigation', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    const neighbors = model.neighbors(model.root!);
    expect(neighbors.length).toBeGreaterThanOrEqual(4);
    expect(neighbors.every((node) => node instanceof GraphNode)).toBe(true);
    expect(model.search('example-storage-1').some((node) => node.label === 'example-storage-1')).toBe(true);
  });

  test('lays out node objects by mutating their positions', () => {
    const model = new OwnerLensGraphParser().parse(sample);
    new HierarchicalLayout().apply(model);
    expect(model.root?.x).toBe(0);
    expect([...model.nodes.values()].some((node) => node.x > 0)).toBe(true);
    expect([...model.nodes.values()].every((node) => Number.isFinite(node.x) && Number.isFinite(node.y))).toBe(true);
  });

  test('rejects malformed reports', () => {
    expect(() => new OwnerLensGraphParser().parse({ meta: {} })).toThrow('Missing enterpriseApplication');
    expect(() => new OwnerLensGraphParser().parse(null)).toThrow('Top-level JSON');
  });
});
