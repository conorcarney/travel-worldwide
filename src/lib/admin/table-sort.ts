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
 * (DD/MM/YYYY, M/YYYY, YYYY-MM-DD, YYYY/MM/DD).
 */
export function dateSortKey(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) return "";

  const yearFirst = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (yearFirst) {
    return `${yearFirst[1]}${yearFirst[2].padStart(2, "0")}${yearFirst[3].padStart(2, "0")}`;
  }

  const dayMonthYear = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayMonthYear) {
    return `${dayMonthYear[3]}${dayMonthYear[2].padStart(2, "0")}${dayMonthYear[1].padStart(2, "0")}`;
  }

  const monthYear = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (monthYear) {
    return `${monthYear[2]}${monthYear[1].padStart(2, "0")}00`;
  }

  return trimmed;
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
