export const PAGE_SIZE = 20;

export function parsePage(value: unknown) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1;
}

export function pageArgs(page: number, size = PAGE_SIZE) {
  return { skip: (page - 1) * size, take: size };
}

export function pageMeta(total: number, page: number, size = PAGE_SIZE) {
  return { total, page, pageSize: size, totalPages: Math.max(1, Math.ceil(total / size)) };
}

export type PageMeta = ReturnType<typeof pageMeta>;
