export function tokenizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

export function rowMatchesQuery(haystack: string, query: string): boolean {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return true;
  const hay = haystack.toLowerCase();
  return tokens.every((token) => hay.includes(token));
}

export function filterRowsByQuery<T>(
  rows: T[],
  query: string,
  getHaystack: (row: T) => string,
): T[] {
  if (!query.trim()) return rows;
  return rows.filter((row) => rowMatchesQuery(getHaystack(row), query));
}
