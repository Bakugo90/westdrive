export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export function resolvePagination(page = 1, limit = 20): {
  page: number;
  limit: number;
  skip: number;
} {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const rawLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 20;
  const safeLimit = Math.min(rawLimit, 100);

  return {
    page: safePage,
    limit: safeLimit,
    skip: (safePage - 1) * safeLimit,
  };
}

export function buildPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  totalItems: number,
): PaginatedResponse<T> {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    items,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}
