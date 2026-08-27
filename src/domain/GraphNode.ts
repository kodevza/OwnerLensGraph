import type { Attributes } from './types';
import { mergeDefined } from './value';

export class GraphNode {
  readonly id: string;
  label: string;
  kind: string;
  attributes: Attributes;
  icon = '';
  x = 0;
  y = 0;

  constructor(id: string, label: string, kind: string, attributes: Attributes = {}) {
    if (!id) throw new Error('GraphNode requires an id.');
    this.id = id;
    this.label = label || id;
    this.kind = kind || 'Unknown';
    this.attributes = { ...attributes };
  }

  merge(label?: string | null, kind?: string | null, attributes: Attributes = {}): this {
    if (label) this.label = label;
    if (kind) this.kind = kind;
    mergeDefined(this.attributes, attributes);
    return this;
  }

  setPosition(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }

  searchableText(): string {
    return `${this.label} ${this.id} ${this.kind} ${JSON.stringify(this.attributes)}`.toLowerCase();
  }

  get isUnknown(): boolean {
    const kind = this.kind.trim().toLowerCase();
    const principalType = String(this.attributes.principalType ?? '').trim().toLowerCase();
    const resourceType = String(this.attributes.resourceType ?? this.attributes.dependencyType ?? '').trim().toLowerCase();
    return kind.includes('unknown') || principalType === 'unknown' || resourceType === 'unknown';
  }
}
