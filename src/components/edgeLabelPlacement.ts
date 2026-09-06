export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeLabelBox extends Rect {
  anchor: Point;
}

export interface PlacementObstacles {
  blockedRects?: Rect[];
  blockedSegments?: Array<{ start: Point; end: Point }>;
}

const CLEARANCE = 7;

/** A compact, content-based size for the foreignObject label card. */
export function measureEdgeLabelBox(lines: string[]): Pick<Rect, 'width' | 'height'> {
  const longestLine = Math.max(...lines.map((line) => line.length), 0);
  return {
    width: Math.min(218, Math.ceil(longestLine * 5.45) + 36),
    height: lines.length * 14 + Math.max(0, lines.length - 1) * 2 + 14,
  };
}

/**
 * Anchors one corner of a compact label box at a quarter point and selects
 * the first corner that does not collide with a node, another edge, or an
 * already placed label.
 */
export function placeEdgeLabelBox(start: Point, end: Point, width: number, height: number, obstacles: PlacementObstacles = {}): EdgeLabelBox {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const normalX = -dy / length;
  const normalY = dx / length;
  const preferredLeft = normalX >= 0;
  const preferredTop = normalY >= 0;
  const positions = [
    { left: preferredLeft, top: preferredTop },
    { left: preferredLeft, top: !preferredTop },
    { left: !preferredLeft, top: preferredTop },
    { left: !preferredLeft, top: !preferredTop },
  ];
  // A left corner starts the left-to-right text at 1/4 of the line; a right
  // corner ends it at 3/4. The box remains attached to the edge: layout, not
  // an artificial gap, supplies the required room.
  const candidates = positions.map(({ left, top }) => {
    const position = left ? (dx >= 0 ? 0.25 : 0.75) : (dx >= 0 ? 0.75 : 0.25);
    const anchor = { x: start.x + dx * position, y: start.y + dy * position };
    return {
      x: anchor.x + (left ? 0 : -width),
      y: anchor.y + (top ? 0 : -height),
      width,
      height,
      anchor,
    };
  });

  return candidates.reduce((best, candidate) => placementPenalty(candidate, obstacles) < placementPenalty(best, obstacles) ? candidate : best);
}

function placementPenalty(candidate: Rect, obstacles: PlacementObstacles): number {
  const padded = expand(candidate, CLEARANCE);
  const rectPenalty = (obstacles.blockedRects ?? []).reduce((total, rect) => total + overlapArea(padded, expand(rect, CLEARANCE)), 0);
  const edgePenalty = (obstacles.blockedSegments ?? []).some((segment) => segmentIntersectsRect(segment.start, segment.end, padded)) ? 100_000 : 0;
  return edgePenalty + rectPenalty;
}

function expand(rect: Rect, amount: number): Rect {
  return { x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 };
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
}

function segmentIntersectsRect(start: Point, end: Point, rect: Rect): boolean {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [[-dx, start.x - rect.x], [dx, rect.x + rect.width - start.x], [-dy, start.y - rect.y], [dy, rect.y + rect.height - start.y]] as Array<[number, number]>) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    }
  }
  return true;
}
