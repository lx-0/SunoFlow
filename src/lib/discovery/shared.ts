import { offsetPagination } from "@/lib/pagination";

export const TRENDING_POOL_SIZE = 500;
export const TRENDING_WINDOW_DAYS = 30;

export function trendingCutoff(): Date {
  return new Date(Date.now() - TRENDING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}

export function paginationMeta(page: number, limit: number, total: number) {
  return { ...offsetPagination(page, limit, total), limit };
}

export function asIsoDate(value: Date | null | undefined): string {
  return value ? value.toISOString() : "";
}
