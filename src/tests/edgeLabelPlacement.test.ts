import { measureEdgeLabelBox, placeEdgeLabelBox } from '../components/edgeLabelPlacement';

describe('placeEdgeLabelBox', () => {
  it('sizes a short label from its content without imposing a minimum width', () => {
    expect(measureEdgeLabelBox(['A']).width).toBe(42);
  });

  it('anchors a left box corner at one quarter of a horizontal edge', () => {
    const box = placeEdgeLabelBox({ x: 10, y: 20 }, { x: 110, y: 20 }, 230, 32);

    expect(box.anchor).toEqual({ x: 35, y: 20 });
    expect(box.x).toBe(35);
    expect(box.y).toBe(20);
  });

  it('moves the attached corner to the other side when the edge direction reverses', () => {
    const box = placeEdgeLabelBox({ x: 110, y: 20 }, { x: 10, y: 20 }, 230, 32);

    expect(box.anchor).toEqual({ x: 35, y: 20 });
    expect(box.x).toBe(35);
    expect(box.y).toBe(-12);
  });

  it('prefers a nearby free corner over a distant gap when the preferred placement hits a node', () => {
    const box = placeEdgeLabelBox(
      { x: 10, y: 20 },
      { x: 110, y: 20 },
      30,
      32,
      { blockedRects: [{ x: 40, y: 40, width: 130, height: 100 }] },
    );

    expect(box.x).toBe(35);
    expect(box.y).toBe(-12);
  });

  it('moves the attachment point along its edge when every midpoint corner intersects another edge', () => {
    const box = placeEdgeLabelBox(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      30,
      20,
      { blockedSegments: [{ start: { x: 100, y: -100 }, end: { x: 100, y: 100 } }] },
    );

    expect(box.anchor).toEqual({ x: 50, y: 0 });
  });

  it('anchors a right box corner at three quarters when the left side is blocked', () => {
    const box = placeEdgeLabelBox(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      30,
      20,
      { blockedRects: [{ x: 0, y: -1000, width: 100, height: 2000 }] },
    );

    expect(box.anchor).toEqual({ x: 150, y: 0 });
    expect(box.x).toBe(120);
  });

  it('keeps the box attached by choosing the opposite corner instead of adding a gap', () => {
    const box = placeEdgeLabelBox(
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      30,
      20,
      { blockedSegments: [{ start: { x: 0, y: 10 }, end: { x: 200, y: 10 } }] },
    );

    expect(box.anchor).toEqual({ x: 50, y: 0 });
    expect(box.x).toBe(50);
    expect(box.y).toBe(-20);
  });
});
