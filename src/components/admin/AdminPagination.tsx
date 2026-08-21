"use client";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  onPageChange: (page: number) => void;
  edge?: "top" | "bottom";
  testId?: string;
};

export function AdminPagination({
  page,
  totalPages,
  start,
  end,
  total,
  onPageChange,
  edge = "bottom",
  testId = "admin-pagination",
}: AdminPaginationProps) {
  if (total === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm text-muted ${
        edge === "top" ? "border-b border-border" : "border-t border-border"
      }`}
      data-testid={testId}
    >
      <span>
        Showing {start}–{end} of {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-foreground disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          data-testid={`${testId}-prev`}
        >
          Previous
        </button>
        <span data-testid={`${testId}-status`}>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-foreground disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          data-testid={`${testId}-next`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
