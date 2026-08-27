import type { GraphModel } from './GraphModel';
import type { GraphNode } from './GraphNode';

export class HierarchicalLayout {
  constructor(
    private readonly horizontalSpacing = 280,
    private readonly verticalSpacing = 150,
  ) {}

  apply(model: GraphModel): void {
    const nodes = [...model.nodes.values()];
    if (!nodes.length) return;
    const root = model.root ?? nodes[0];
    const depth = new Map<string, number>([[root.id, 0]]);
    const queue: GraphNode[] = [root];

    while (queue.length) {
      const current = queue.shift()!;
      const nextDepth = (depth.get(current.id) ?? 0) + 1;
      for (const neighbor of model.neighbors(current)) {
        if (depth.has(neighbor.id)) continue;
        depth.set(neighbor.id, nextDepth);
        queue.push(neighbor);
      }
    }

    let fallbackDepth = Math.max(0, ...depth.values()) + 1;
    for (const node of nodes) {
      if (!depth.has(node.id)) depth.set(node.id, fallbackDepth++);
    }

    const levels = new Map<number, GraphNode[]>();
    for (const node of nodes) {
      const d = depth.get(node.id) ?? 0;
      const level = levels.get(d) ?? [];
      level.push(node);
      levels.set(d, level);
    }

    for (const [d, levelNodes] of levels) {
      levelNodes.sort((a, b) => a.label.localeCompare(b.label));
      const totalHeight = Math.max(0, (levelNodes.length - 1) * this.verticalSpacing);
      levelNodes.forEach((node, index) => {
        node.setPosition(d * this.horizontalSpacing, index * this.verticalSpacing - totalHeight / 2);
      });
    }
  }
}
