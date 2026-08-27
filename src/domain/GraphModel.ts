import { GraphEdge } from './GraphEdge';
import { GraphNode } from './GraphNode';
import type { Attributes } from './types';
import { shortId } from './value';

export class GraphModel {
  readonly nodes = new Map<string, GraphNode>();
  readonly edges = new Map<string, GraphEdge>();
  root: GraphNode | null = null;
  readonly meta: Attributes;
  readonly summary: Attributes;

  constructor(meta: Attributes = {}, summary: Attributes = {}) {
    this.meta = { ...meta };
    this.summary = { ...summary };
  }

  upsertNode(id: string, label?: string | null, kind?: string | null, attributes: Attributes = {}): GraphNode {
    const existing = this.nodes.get(id);
    if (existing) return existing.merge(label, kind, attributes);
    const node = new GraphNode(id, label || shortId(id), kind || 'Unknown', attributes);
    this.nodes.set(id, node);
    return node;
  }

  addEdge(id: string, source: GraphNode | string, target: GraphNode | string, label: string, kind: string, attributes: Attributes = {}): GraphEdge {
    const sourceNode = typeof source === 'string' ? this.requireNode(source) : source;
    const targetNode = typeof target === 'string' ? this.requireNode(target) : target;
    let uniqueId = id || `${sourceNode.id}->${targetNode.id}:${kind}:${label}`;
    let suffix = 2;
    while (this.edges.has(uniqueId)) uniqueId = `${id}#${suffix++}`;
    const edge = new GraphEdge(uniqueId, sourceNode, targetNode, label, kind, attributes);
    this.edges.set(uniqueId, edge);
    return edge;
  }

  requireNode(id: string): GraphNode {
    const node = this.nodes.get(id);
    if (!node) throw new Error(`Unknown node: ${id}`);
    return node;
  }

  neighbors(node: GraphNode | string): GraphNode[] {
    const nodeId = typeof node === 'string' ? node : node.id;
    const found = new Map<string, GraphNode>();
    for (const edge of this.edges.values()) {
      if (edge.source.id === nodeId) found.set(edge.target.id, edge.target);
      if (edge.target.id === nodeId) found.set(edge.source.id, edge.source);
    }
    return [...found.values()];
  }

  incidentEdges(node: GraphNode | string): GraphEdge[] {
    const nodeId = typeof node === 'string' ? node : node.id;
    return [...this.edges.values()].filter((edge) => edge.source.id === nodeId || edge.target.id === nodeId);
  }

  search(query: string, limit = 30): GraphNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return [...this.nodes.values()].filter((node) => node.searchableText().includes(q)).slice(0, limit);
  }
}
