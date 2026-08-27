import type { Attributes } from './types';
import type { GraphNode } from './GraphNode';

export class GraphEdge {
  readonly id: string;
  readonly source: GraphNode;
  readonly target: GraphNode;
  readonly label: string;
  readonly kind: string;
  readonly attributes: Attributes;

  constructor(id: string, source: GraphNode, target: GraphNode, label: string, kind: string, attributes: Attributes = {}) {
    if (!id) throw new Error('GraphEdge requires an id.');
    this.id = id;
    this.source = source;
    this.target = target;
    this.label = label || kind || 'relationship';
    this.kind = kind || 'relationship';
    this.attributes = { ...attributes };
  }
}
