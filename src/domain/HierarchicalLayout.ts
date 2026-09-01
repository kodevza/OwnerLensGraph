import type { GraphModel } from './GraphModel';
import type { GraphNode } from './GraphNode';

export class HierarchicalLayout {
  constructor(
    private readonly horizontalSpacing = 280,
    private readonly verticalSpacing = 100,
  ) {}

  apply(model: GraphModel, viewportAspectRatio = 16 / 9): void {
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

    const orderedLevels = [...levels.entries()].sort(([a], [b]) => a - b);
    for (const [, levelNodes] of orderedLevels) levelNodes.sort((a, b) => a.label.localeCompare(b.label));

    // Repeated barycentric sweeps put nodes close to their neighbours in the
    // adjacent level. This reduces crossings while keeping the layout stable
    // for nodes which have no adjacent-level connection.
    for (let pass = 0; pass < 4; pass++) {
      for (let index = 1; index < orderedLevels.length; index++) {
        this.orderByAdjacentLevel(orderedLevels[index][1], orderedLevels[index - 1][1], model);
      }
      for (let index = orderedLevels.length - 2; index >= 0; index--) {
        this.orderByAdjacentLevel(orderedLevels[index][1], orderedLevels[index + 1][1], model);
      }
    }

    const maxLevelSize = Math.max(...orderedLevels.map(([, levelNodes]) => levelNodes.length));
    const horizontalSpacing = this.horizontalSpacingForAspect(orderedLevels.length, maxLevelSize, viewportAspectRatio);

    for (const [d, levelNodes] of orderedLevels) {
      const totalCrossAxis = Math.max(0, (levelNodes.length - 1) * this.verticalSpacing);
      levelNodes.forEach((node, index) => {
        const crossAxisPosition = index * this.verticalSpacing - totalCrossAxis / 2;
        node.setPosition(d * horizontalSpacing, crossAxisPosition);
      });
    }
  }

  private horizontalSpacingForAspect(levelCount: number, maxLevelSize: number, viewportAspectRatio: number): number {
    if (levelCount < 2) return this.horizontalSpacing;
    const height = Math.max(this.verticalSpacing, (maxLevelSize - 1) * this.verticalSpacing);
    const targetWidth = height * Math.max(viewportAspectRatio, Number.EPSILON);
    const requiredSpacing = targetWidth / (levelCount - 1);
    // Expand only horizontally, retaining the familiar left-to-right hierarchy.
    return Math.min(this.horizontalSpacing * 1.6, Math.max(this.horizontalSpacing, requiredSpacing));
  }

  private orderByAdjacentLevel(levelNodes: GraphNode[], adjacentNodes: GraphNode[], model: GraphModel): void {
    const adjacentOrder = new Map(adjacentNodes.map((node, index) => [node.id, index]));
    const originalOrder = new Map(levelNodes.map((node, index) => [node.id, index]));
    const barycenter = (node: GraphNode): number | null => {
      const positions = model.incidentEdges(node)
        .map((edge) => edge.source.id === node.id ? edge.target.id : edge.source.id)
        .map((id) => adjacentOrder.get(id))
        .filter((position): position is number => position !== undefined);
      return positions.length ? positions.reduce((sum, position) => sum + position, 0) / positions.length : null;
    };

    levelNodes.sort((a, b) => {
      const aCenter = barycenter(a);
      const bCenter = barycenter(b);
      if (aCenter === null || bCenter === null) return (originalOrder.get(a.id) ?? 0) - (originalOrder.get(b.id) ?? 0);
      return aCenter - bCenter || (originalOrder.get(a.id) ?? 0) - (originalOrder.get(b.id) ?? 0);
    });
  }
}
