export const ADMIN_PAGE_SIZE = 50;

export type PageSlice<T> = {
  page: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
  rows: T[];
};

export function paginateRows<T>(
  rows: T[],
  page: number,
  pageSize: number = ADMIN_PAGE_SIZE,
): PageSlice<T> {
  const size = Math.max(1, pageSize);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = (safePage - 1) * size;
  const slice = rows.slice(from, from + size);

  return {
    page: safePage,
    totalPages,
    total,
    start: total === 0 ? 0 : from + 1,
    end: from + slice.length,
    rows: slice,
  };
}
