import { tripDateSortKey } from "@/lib/trip-date";

export type SortDirection = "asc" | "desc";

export type SortState<K extends string> = {
  key: K;
  direction: SortDirection;
};

/** Toggle sort: first click asc, second click desc on the same column. */
export function nextSortState<K extends string>(
  current: SortState<K> | null,
  key: K,
): SortState<K> {
  if (current?.key === key) {
    return {
      key,
      direction: current.direction === "asc" ? "desc" : "asc",
    };
  }
  return { key, direction: "asc" };
}

/**
 * Build a lexicographically sortable key for mixed admin date strings
 * (DD/MM/YYYY, optional HH:MM, M/YYYY, YYYY-MM-DD, YYYY/MM/DD).
 */
export function dateSortKey(date: string): string {
  return tripDateSortKey(date);
}

export function compareSortValues(
  a: string | number,
  b: string | number,
  direction: SortDirection,
): number {
  const factor = direction === "asc" ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") {
    return (a - b) * factor;
  }
  return (
    String(a).localeCompare(String(b), undefined, {
      sensitivity: "base",
      numeric: true,
    }) * factor
  );
}

export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K> | null,
  accessors: Record<K, (row: T) => string | number>,
): T[] {
  if (!sort) return rows;
  const accessor = accessors[sort.key];
  return [...rows].sort((left, right) =>
    compareSortValues(accessor(left), accessor(right), sort.direction),
  );
}
