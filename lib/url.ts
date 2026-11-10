export type SearchParams = Record<string, string | undefined>;

/** Builds a link to `path` with the current query, changed by `changes`. Empty values are dropped. */
export function withParams(path: string, current: SearchParams, changes: SearchParams = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...changes })) {
    if (value) query.set(key, value);
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
