"use client";

import { useMemo, useState } from "react";
import {
  nextSortState,
  sortRows,
  type SortState,
} from "@/lib/admin/table-sort";

export function useTableSort<T, K extends string>(
  rows: readonly T[],
  accessors: Record<K, (row: T) => string | number>,
) {
  const [sort, setSort] = useState<SortState<K> | null>(null);
  const sorted = useMemo(
    () => sortRows([...rows], sort, accessors),
    [rows, sort, accessors],
  );

  function onSort(key: K) {
    setSort((current) => nextSortState(current, key));
  }

  return { sort, sorted, onSort };
}
