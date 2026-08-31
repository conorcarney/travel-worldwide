"use client";

import type { SortDirection } from "@/lib/admin/table-sort";

type SortableHeaderProps<K extends string> = {
  label: string;
  columnKey: K;
  activeKey: K | null;
  direction: SortDirection | null;
  onSort: (key: K) => void;
  className?: string;
  testId?: string;
};

export function SortableHeader<K extends string>({
  label,
  columnKey,
  activeKey,
  direction,
  onSort,
  className = "px-3 py-2 font-medium",
  testId,
}: SortableHeaderProps<K>) {
  const active = activeKey === columnKey;

  return (
    <th
      className={className}
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 text-left transition-colors hover:text-foreground"
        onClick={() => onSort(columnKey)}
        data-testid={testId ?? `sort-${columnKey}`}
      >
        {label}
        <span className="min-w-[0.75rem] text-xs opacity-80" aria-hidden>
          {active ? (direction === "asc" ? "↑" : "↓") : ""}
        </span>
      </button>
    </th>
  );
}
