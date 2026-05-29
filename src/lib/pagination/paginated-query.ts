import { offsetPagination, type OffsetPagination } from "./index";

export async function paginatedQuery<T, R = T>(opts: {
  findMany: () => Promise<T[]>;
  count: () => Promise<number>;
  page: number;
  limit: number;
  transform?: (items: T[]) => R[];
}): Promise<{ items: R[] } & OffsetPagination> {
  const [raw, total] = await Promise.all([opts.findMany(), opts.count()]);
  const items = opts.transform
    ? opts.transform(raw)
    : (raw as unknown as R[]);
  return { items, ...offsetPagination(opts.page, opts.limit, total) };
}
