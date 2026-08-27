import { buildConnections } from '../components/edgePresentation';
import { GraphEdge, GraphNode } from '../domain';

describe('buildConnections', () => {
  test('combines RBAC and activity evidence into one coloured connection', () => {
    const source = new GraphNode('source', 'Identity', 'ServicePrincipal');
    const target = new GraphNode('target', 'Storage', 'Resource');
    const rbac = new GraphEdge('rbac', source, target, 'Reader', 'RBAC', { confidence: 'MED' });
    const log = new GraphEdge('log', source, target, '6 activity events', 'activity', { evidenceConfidence: 'HIGH' });

    const [connection] = buildConnections([rbac, log]);

    expect(connection.edges).toEqual([rbac, log]);
    expect(connection.confidence).toBe('HIGH');
    expect(connection.items).toEqual([
      { icon: 'lock', text: 'RBAC · Reader' },
      { icon: 'log', text: 'Log · 6 activity events' },
    ]);
  });
});
