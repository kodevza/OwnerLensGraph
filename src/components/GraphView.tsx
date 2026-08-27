import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react';
import type { GraphEdge, GraphModel, GraphNode } from '../domain';
import { BookOpenText, Link, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { buildConnections, type EdgeIcon } from './edgePresentation';

interface GraphViewProps {
  model: GraphModel;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  onSelectNode(node: GraphNode): void;
  onSelectEdge(edge: GraphEdge): void;
  onClearSelection(): void;
  showUnknown: boolean;
  revision: number;
  onNodeMoved(): void;
}

interface Viewport { x: number; y: number; scale: number }
interface Point { x: number; y: number }

export function GraphView({ model, selectedNode, selectedEdge, onSelectNode, onSelectEdge, onClearSelection, showUnknown, revision, onNodeMoved }: GraphViewProps) {
  void revision;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>({ x: 100, y: 360, scale: 1 });
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [tooltip, setTooltip] = useState<Point>({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<GraphNode | null>(null);
  const [panning, setPanning] = useState<{ start: Point; origin: Point } | null>(null);

  const highlightedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return new Set([selectedNode.id, ...model.neighbors(selectedNode).map((n) => n.id)]);
  }, [model, selectedNode, revision]);

  const visibleNodes = useMemo(
    () => [...model.nodes.values()].filter((node) => node.kind.toLowerCase() !== 'subscription' && (showUnknown || !node.isUnknown)),
    [model, showUnknown, revision],
  );
  const visibleNodeIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => [...model.edges.values()].filter((edge) => visibleNodeIds.has(edge.source.id) && visibleNodeIds.has(edge.target.id)),
    [model, visibleNodeIds, revision],
  );
  const connections = useMemo(() => buildConnections(visibleEdges), [visibleEdges]);

  const toWorld = (event: { clientX: number; clientY: number }): Point => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (event.clientX - rect.left - viewport.x) / viewport.scale,
      y: (event.clientY - rect.top - viewport.y) / viewport.scale,
    };
  };

  const onBackgroundPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    setPanning({ start: { x: event.clientX, y: event.clientY }, origin: { x: viewport.x, y: viewport.y } });
    onClearSelection();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (draggingNode) {
      const point = toWorld(event);
      draggingNode.setPosition(point.x, point.y);
      onNodeMoved();
      return;
    }
    if (panning) {
      setViewport((current) => ({ ...current, x: panning.origin.x + event.clientX - panning.start.x, y: panning.origin.y + event.clientY - panning.start.y }));
    }
  };

  const endPointerAction = (event: ReactPointerEvent<SVGSVGElement>) => {
    setDraggingNode(null);
    setPanning(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const onWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.12 : 0.89;
    setViewport((current) => ({ ...current, scale: Math.min(2.6, Math.max(0.28, current.scale * factor)) }));
  };

  function fit() {
    const nodes = visibleNodes;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!nodes.length || !rect) return;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - 100;
    const maxX = Math.max(...xs) + 100;
    const minY = Math.min(...ys) - 100;
    const maxY = Math.max(...ys) + 100;
    const graphWidth = Math.max(1, maxX - minX);
    const graphHeight = Math.max(1, maxY - minY);
    const scale = Math.min(1.5, Math.max(0.3, Math.min(rect.width / graphWidth, rect.height / graphHeight) * 0.9));
    setViewport({
      scale,
      x: rect.width / 2 - ((minX + maxX) / 2) * scale,
      y: rect.height / 2 - ((minY + maxY) / 2) * scale,
    });
  }


  useEffect(() => {
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
    // Fit only when a new model is loaded, not while objects are dragged.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, showUnknown]);
  return (
    <div className="graph-stage">
      <button className="fit-button" type="button" onClick={fit}>Fit graph</button>
      <svg
        ref={svgRef}
        className="graph-svg"
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointerAction}
        onPointerCancel={endPointerAction}
        onWheel={onWheel}
        role="img"
        aria-label="Interactive OwnerLens relationship graph"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="arrow-head" />
          </marker>
        </defs>
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.scale})`}>
          {connections.map((connection) => {
            const active = connection.edges.some((edge) => selectedEdge?.id === edge.id) || selectedNode?.id === connection.source.id || selectedNode?.id === connection.target.id;
            const dx = connection.target.x - connection.source.x;
            const dy = connection.target.y - connection.source.y;
            const length = Math.max(1, Math.hypot(dx, dy));
            const ux = dx / length;
            const uy = dy / length;
            const x1 = connection.source.x + ux * 34;
            const y1 = connection.source.y + uy * 34;
            const x2 = connection.target.x - ux * 40;
            const y2 = connection.target.y - uy * 40;
            const cardHeight = connection.items.length * 24 + 8;
            return (
              <g key={connection.id} className={`edge ${active ? 'active' : ''} ${connection.confidence ? `confidence-${connection.confidence.toLowerCase()}` : ''}`} onPointerDown={(e) => e.stopPropagation()} onClick={() => onSelectEdge(connection.edges[0])}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} markerEnd="url(#arrow)" />
                <foreignObject x={(x1 + x2) / 2 - 115} y={(y1 + y2) / 2 - cardHeight / 2} width="230" height={cardHeight}>
                  <div className={`edge-label-card ${connection.confidence ? `confidence-${connection.confidence.toLowerCase()}` : ''}`}>
                    {connection.items.map((item) => <ConnectionLine key={`${item.icon}:${item.text}`} item={item} />)}
                  </div>
                </foreignObject>
              </g>
            );
          })}
          {visibleNodes.map((node) => {
            const selected = selectedNode?.id === node.id;
            const dimmed = selectedNode && !highlightedNodeIds.has(node.id);
            return (
              <g
                key={node.id}
                className={`graph-node ${selected ? 'selected' : ''} ${dimmed ? 'dimmed' : ''}`}
                transform={`translate(${node.x} ${node.y})`}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.stopPropagation();
                  setDraggingNode(node);
                  svgRef.current?.setPointerCapture(event.pointerId);
                  onSelectNode(node);
                }}
                onPointerEnter={(event) => {
                  setHovered(node);
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) setTooltip({ x: event.clientX - rect.left + 16, y: event.clientY - rect.top + 16 });
                }}
                onPointerMove={(event) => {
                  const rect = svgRef.current?.getBoundingClientRect();
                  if (rect) setTooltip({ x: event.clientX - rect.left + 16, y: event.clientY - rect.top + 16 });
                }}
                onPointerLeave={() => setHovered(null)}
              >
                <circle r={34} />
                <image href={node.icon} x={-22} y={-22} width={44} height={44} preserveAspectRatio="xMidYMid meet" />
                <text className="node-label" y={57} textAnchor="middle">{node.label}</text>
                <text className="node-kind" y={74} textAnchor="middle">{node.kind}</text>
              </g>
            );
          })}
        </g>
      </svg>
      {hovered && (
        <div className="hover-card" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="hover-heading"><img src={hovered.icon} alt="" /><div><small>{hovered.kind}</small><strong>{hovered.label}</strong></div></div>
          {Object.entries(hovered.attributes).slice(0, 7).map(([key, value]) => (
            <div className="hover-row" key={key}><span>{key}</span><b>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</b></div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionLine({ item }: { item: { icon: EdgeIcon; text: string } }) {
  const Icon = item.icon === 'lock' ? LockKeyhole
    : item.icon === 'log' ? BookOpenText
      : item.icon === 'owner' ? UserRound
        : item.icon === 'evidence' ? ShieldCheck
          : Link;
  return <div className="edge-label-line"><Icon aria-hidden="true" size={13} /><span>{item.text}</span></div>;
}
