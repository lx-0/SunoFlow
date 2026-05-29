export type SearchParamsLike = Pick<URLSearchParams, "get">;

export function parseCsvParam(value: string | null): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function setSearchParamIfPresent(
  params: URLSearchParams,
  key: string,
  value: string
): void {
  if (value) params.set(key, value);
}

export function setSearchParamIfNotDefault(
  params: URLSearchParams,
  key: string,
  value: string,
  defaultValue: string
): void {
  if (value !== defaultValue) params.set(key, value);
}
