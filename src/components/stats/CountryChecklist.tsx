"use client";

import type { CountryChecklistRow } from "@/lib/map/country-checklist";
import { SortableHeader } from "@/components/admin/SortableHeader";
import { useTableSort } from "@/lib/admin/use-table-sort";

type CountryChecklistProps = {
  rows: CountryChecklistRow[];
  visitedCount: number;
  totalCount: number;
};

type ChecklistSortKey = "name";

const CHECKLIST_ACCESSORS: Record<
  ChecklistSortKey,
  (row: CountryChecklistRow) => string | number
> = {
  name: (row) => row.name,
};

function slug(name: string): string {
  return name.replace(/\s+/g, "-").toLowerCase();
}

function CountryTable({
  title,
  rows,
  testId,
  emptyMessage,
}: {
  title: string;
  rows: CountryChecklistRow[];
  testId: string;
  emptyMessage: string;
}) {
  const { sort, sorted, onSort } = useTableSort(rows, CHECKLIST_ACCESSORS);

  return (
    <div data-testid={testId}>
      <h3 className="font-display text-base text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted">
        {rows.length.toLocaleString("en-GB")}{" "}
        {rows.length === 1 ? "country" : "countries"}
      </p>
      <div className="mt-3 overflow-x-auto">
        {rows.length > 0 ? (
          <table className="w-full min-w-[12rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted">
                <SortableHeader
                  label="Country / territory"
                  columnKey="name"
                  activeKey={sort?.key ?? null}
                  direction={sort?.direction ?? null}
                  onSort={onSort}
                  className="pb-2 font-medium"
                  testId={`${testId}-sort-name`}
                />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.name}
                  className="border-b border-border/60"
                  data-testid={`${testId}-${slug(row.name)}`}
                >
                  <td className="py-2 text-foreground">
                    {row.name}
                    {row.disputed ? (
                      <span className="ml-2 text-xs text-muted">disputed</span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-muted">{emptyMessage}</p>
        )}
      </div>
    </div>
  );
}

export function CountryChecklist({
  rows,
  visitedCount,
  totalCount,
}: CountryChecklistProps) {
  const visited = rows.filter((row) => row.visited);
  const notVisited = rows.filter((row) => !row.visited);

  return (
    <section className="mt-10" data-testid="country-checklist">
      <h2 className="font-display text-lg text-foreground">Country checklist</h2>
      <p className="mt-1 text-sm text-muted">
        All countries and disputed territories ({totalCount.toLocaleString("en-GB")}
        ) — {visitedCount.toLocaleString("en-GB")} visited,{" "}
        {(totalCount - visitedCount).toLocaleString("en-GB")} not yet.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <CountryTable
          title="Visited"
          rows={visited}
          testId="country-checklist-visited"
          emptyMessage="No countries marked as visited yet."
        />
        <CountryTable
          title="Not visited"
          rows={notVisited}
          testId="country-checklist-not-visited"
          emptyMessage="You have visited every country on the list."
        />
      </div>
    </section>
  );
}
