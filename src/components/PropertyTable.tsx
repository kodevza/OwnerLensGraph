import { formatValue } from '../domain';

export function PropertyTable({ value }: { value?: Record<string, unknown> }) {
  if (!value) return <p className="muted">Nothing selected.</p>;
  const rows = Object.entries(value).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0));
  return (
    <div className="properties">
      {rows.map(([key, val]) => (
        <div className="property" key={key}>
          <div className="property-key">{key}</div>
          <pre>{formatValue(val)}</pre>
        </div>
      ))}
    </div>
  );
}
