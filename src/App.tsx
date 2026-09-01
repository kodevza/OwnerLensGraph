import { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { GraphView } from './components/GraphView';
import { PropertyTable } from './components/PropertyTable';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { GraphEdge, GraphModel, GraphNode, HierarchicalLayout, OwnerLensGraphParser } from './domain';
import { Check, Copy, Eye, EyeOff, Upload } from 'lucide-react';
import exampleReport from '../examples/ownerlens-sample.json';

const installCommand = 'Install-Module OwnerLensLite -Scope CurrentUser';
const reportCommand = 'Invoke-OwnerLensLite -EnterpriseApplication "<service-principal-object-id-or-app-id-or-exact-display-name>" -OutputPath "./reports/ownerlens.json"';

function graphViewportAspectRatio(): number {
  const isNarrowLayout = window.innerWidth <= 900;
  const graphWidth = window.innerWidth - (isNarrowLayout ? 0 : 340);
  const graphHeight = (window.innerHeight - 62) * (isNarrowLayout ? 0.65 : 1);
  return Math.max(1, graphWidth) / Math.max(1, graphHeight);
}

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
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

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

  const copyCommand = async (command: string) => {
    await navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    window.setTimeout(() => setCopiedCommand((current) => current === command ? null : current), 1800);
  };

  const loadReport = (data: unknown, name: string) => {
    try {
      const next = new OwnerLensGraphParser().parse(data);
      new HierarchicalLayout().apply(next, graphViewportAspectRatio());
      setModel(next);
      setFileName(name);
      setSelectedNode(next.root);
      setSelectedEdge(null);
      setQuery('');
      setShowUnknown(false);
      setError('');
      setRevision((x) => x + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      loadReport(JSON.parse(await file.text()), file.name);
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
              <h1>Load an OwnerLensLite JSON report</h1>
              <p>First, install the local <a href="https://github.com/kodevza/OwnerLensLite" target="_blank" rel="noreferrer">OwnerLensLite</a> tool in PowerShell 7+:</p>
              <div className="command"><code>{installCommand}</code><button type="button" onClick={() => void copyCommand(installCommand)} aria-label="Copy installation command" title="Copy command">{copiedCommand === installCommand ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}</button></div>
              <p>Then create a report for the Enterprise Application and save the output as JSON. Use its service-principal object ID, app ID, or exact display name:</p>
              <div className="command"><code>{reportCommand}</code><button type="button" onClick={() => void copyCommand(reportCommand)} aria-label="Copy report command" title="Copy command">{copiedCommand === reportCommand ? <Check aria-hidden="true" size={16} /> : <Copy aria-hidden="true" size={16} />}</button></div>
              <p>When the command finishes, select <code>./reports/ownerlens.json</code> below. The report is processed locally in your browser.</p>
              <div className="empty-actions">
                <Button size="lg" onClick={openFile}><Upload aria-hidden="true" size={17} />Load JSON file</Button>
                <Button size="lg" className="example-button" onClick={() => loadReport(exampleReport, 'ownerlens-sample.json')}>Load example</Button>
              </div>
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
