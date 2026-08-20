"use client";

type AdminPaginationProps = {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  onPageChange: (page: number) => void;
};

export function AdminPagination({
  page,
  totalPages,
  start,
  end,
  total,
  onPageChange,
}: AdminPaginationProps) {
  if (total === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2 text-sm text-muted"
      data-testid="admin-pagination"
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
          data-testid="admin-pagination-prev"
        >
          Previous
        </button>
        <span data-testid="admin-pagination-status">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="rounded-md border border-border px-2 py-1 text-foreground disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          data-testid="admin-pagination-next"
        >
          Next
        </button>
      </div>
    </div>
  );
}
