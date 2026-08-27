import type { GraphEdge, GraphNode } from '../domain';

export type EdgeIcon = 'lock' | 'log' | 'evidence' | 'owner' | 'relationship';
export type EvidenceConfidence = 'HIGH' | 'MED' | 'LOW' | null;

export interface ConnectionItem {
  icon: EdgeIcon;
  text: string;
}

export interface GraphConnection {
  id: string;
  source: GraphNode;
  target: GraphNode;
  edges: GraphEdge[];
  items: ConnectionItem[];
  confidence: EvidenceConfidence;
}

const confidenceRank: Record<Exclude<EvidenceConfidence, null>, number> = { LOW: 1, MED: 2, HIGH: 3 };

function edgeConfidence(edge: GraphEdge): EvidenceConfidence {
  const value = String(edge.attributes.confidence ?? edge.attributes.evidenceConfidence ?? '').trim().toUpperCase();
  return value === 'HIGH' || value === 'MED' || value === 'LOW' ? value : null;
}

function itemFor(edge: GraphEdge): ConnectionItem {
  const kind = edge.kind.toLowerCase();
  if (kind === 'rbac') return { icon: 'lock', text: `RBAC · ${edge.label}` };
  if (kind === 'activity' || kind.includes('log')) return { icon: 'log', text: `Log · ${edge.label}` };
  if (kind === 'owner') return { icon: 'owner', text: `Owner · ${edge.label}` };
  if (kind.includes('evidence')) return { icon: 'evidence', text: `Evidence · ${edge.label}` };
  return { icon: 'relationship', text: `${edge.kind} · ${edge.label}` };
}

export function buildConnections(edges: GraphEdge[]): GraphConnection[] {
  const grouped = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    const key = `${edge.source.id}\u0000${edge.target.id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), edge]);
  }

  return [...grouped.values()].map((connectionEdges) => {
    const items = connectionEdges.map(itemFor).filter((item, index, all) => all.findIndex((candidate) => candidate.icon === item.icon && candidate.text === item.text) === index);
    const confidence = connectionEdges.reduce<EvidenceConfidence>((highest, edge) => {
      const current = edgeConfidence(edge);
      return current && (!highest || confidenceRank[current] > confidenceRank[highest]) ? current : highest;
    }, null);
    const [first] = connectionEdges;
    return {
      id: connectionEdges.map((edge) => edge.id).join('|'),
      source: first.source,
      target: first.target,
      edges: connectionEdges,
      items,
      confidence,
    };
  });
}
