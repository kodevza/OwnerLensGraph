export function normalize(value: unknown): string {
  return String(value ?? '').replace(/\\/g, '/').toLowerCase();
}

export function asString(value: unknown): string {
  if (value == null) return '';
  return typeof value === 'string' ? value : String(value);
}

export function shortId(value: unknown, max = 28): string {
  const text = asString(value);
  if (text.length <= max) return text;
  const head = Math.max(8, Math.floor((max - 1) * 0.55));
  const tail = Math.max(6, max - head - 1);
  return `${text.slice(0, head)}…${text.slice(-tail)}`;
}

export function compactAttributes(attributes: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => {
      if (value == null || value === '') return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    }),
  );
}

export function mergeDefined(target: Record<string, unknown>, source?: Record<string, unknown>): Record<string, unknown> {
  for (const [key, value] of Object.entries(source ?? {})) {
    if (value == null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    target[key] = value;
  }
  return target;
}

export function formatValue(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}
