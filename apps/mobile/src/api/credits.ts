import { apiGet } from "./client";

// Monthly credit usage (GET /api/credits → MonthlyCreditUsage). Read-only display
// only — buying credits / subscribing is intentionally NOT in the iOS app (Apple
// IAP policy forbids selling digital goods via external payment).

export interface Credits {
  remaining: number;
  budget: number;
  usedThisMonth: number;
  generationsThisMonth: number;
}

export async function fetchCredits(): Promise<Credits> {
  const r = await apiGet<Record<string, unknown>>("/api/credits");
  const num = (k: string) => (typeof r?.[k] === "number" ? (r[k] as number) : 0);
  return {
    remaining: num("creditsRemaining"),
    budget: num("budget"),
    usedThisMonth: num("creditsUsedThisMonth"),
    generationsThisMonth: num("generationsThisMonth"),
  };
}
