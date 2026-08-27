import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { GraphView } from './components/GraphView';
import { PropertyTable } from './components/PropertyTable';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { GraphEdge, GraphModel, GraphNode, HierarchicalLayout, OwnerLensGraphParser } from './domain';
import { Eye, EyeOff, Upload } from 'lucide-react';

export default function App() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [model, setModel] = useState<GraphModel | null>(null);
  const [fileName, setFileName] = useState('No JSON loaded');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [showUnknown, setShowUnknown] = useState(false);

  const graphStatus = useMemo(() => {
    const nodes = [...(model?.nodes.values() ?? [])];
    const unknown = nodes.filter((node) => node.isUnknown).length;
    return { found: nodes.length - unknown, unknown };
  }, [model, revision]);
  const searchMatches = useMemo(
    () => (model?.search(query, 25) ?? []).filter((node) => showUnknown || !node.isUnknown),
    [model, query, revision, showUnknown],
  );

  const openFile = () => fileRef.current?.click();

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const next = new OwnerLensGraphParser().parse(data);
      new HierarchicalLayout().apply(next);
      setModel(next);
      setFileName(file.name);
      setSelectedNode(next.root);
      setSelectedEdge(null);
      setQuery('');
      setShowUnknown(false);
      setError('');
      setRevision((x) => x + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      event.target.value = '';
    }
  };

  const selectNode = (node: GraphNode) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  };
  const selectEdge = (edge: GraphEdge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  };
  const clear = () => {
    setSelectedEdge(null);
    setSelectedNode(null);
  };

  const toggleUnknown = () => {
    setShowUnknown((current) => !current);
    setSelectedNode((node) => node?.isUnknown ? null : node);
    setSelectedEdge((edge) => edge && (edge.source.isUnknown || edge.target.isUnknown) ? null : edge);
  };

  const selected = selectedNode ?? selectedEdge;

  return (
    <div className="app-shell">
      <header className="toolbar">
        <div className="brand"><strong>OwnerLens Graph Explorer</strong><span>{fileName}</span></div>
        <div className="toolbar-actions">
          <input ref={fileRef} type="file" accept="application/json,.json,.txt" hidden onChange={loadFile} />
          <Button onClick={openFile}><Upload aria-hidden="true" size={15} />Load JSON</Button>
          {model && (
            <button
              type="button"
              className="status-badge-button"
              onClick={toggleUnknown}
              aria-pressed={showUnknown}
              title={showUnknown ? 'Hide unknown objects' : 'Show unknown objects'}
            >
              <Badge variant="secondary"><span className="status-dot" aria-hidden="true" />{graphStatus.found} Azure objects found</Badge>
              <Badge variant={graphStatus.unknown ? 'warning' : 'outline'}>{graphStatus.unknown} unknown {showUnknown ? <EyeOff aria-hidden="true" size={13} /> : <Eye aria-hidden="true" size={13} />}</Badge>
            </button>
          )}
        </div>
      </header>

      {error && <div className="error">Could not load file: {error}</div>}

      <main className="workspace">
        <section className="graph-area">
          {!model ? (
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <h1>Load an OwnerLens JSON report</h1>
              <p>The JSON is parsed locally into <code>GraphNode</code> and <code>GraphEdge</code> objects.</p>
              <Button size="lg" onClick={openFile}><Upload aria-hidden="true" size={17} />Load JSON file</Button>
              <p className="hint">Sample: <code>examples/ownerlens-sample.json</code></p>
            </div>
          ) : (
            <GraphView
              model={model}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onSelectNode={selectNode}
              onSelectEdge={selectEdge}
              onClearSelection={clear}
              showUnknown={showUnknown}
              revision={revision}
              onNodeMoved={() => setRevision((x) => x + 1)}
            />
          )}
        </section>

        <aside className="side-panel">
          <div className="search-block">
            <label htmlFor="search">Find node object</label>
            <input id="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="name, id, type, attribute…" disabled={!model} />
            {searchMatches.length > 0 && (
              <div className="search-results">
                {searchMatches.map((node) => (
                  <button type="button" key={node.id} onClick={() => selectNode(node)}>
                    <img src={node.icon} alt="" /><span><strong>{node.label}</strong><small>{node.kind}</small></span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="panel-title">
            <div className="panel-title-main">
              {selectedNode && <img src={selectedNode.icon} alt="" />}
              <div><strong>{selected instanceof GraphNode ? selected.label : selected instanceof GraphEdge ? selected.label : 'Inspector'}</strong><span>{selected instanceof GraphNode ? selected.kind : selected instanceof GraphEdge ? selected.kind : 'Select a node or edge'}</span></div>
            </div>
          </div>

          {selectedEdge && (
            <div className="edge-summary"><span>{selectedEdge.source.label}</span><b>→ {selectedEdge.label} →</b><span>{selectedEdge.target.label}</span></div>
          )}
          <PropertyTable value={selected?.attributes} />

          {model && <div className="stats"><span><b>{model.nodes.size}</b> node objects</span><span><b>{model.edges.size}</b> edge objects</span></div>}
        </aside>
      </main>
    </div>
  );
}
