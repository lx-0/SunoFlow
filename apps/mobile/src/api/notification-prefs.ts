import { apiGet, apiPatch } from "./client";

// Notification preferences (email + push) for the native app. Mirrors the web
// REST contract: GET/PATCH /api/profile/email-preferences and /api/push/preferences.
// Both GET endpoints return the data object directly. Mapping is defensive —
// every value is type-checked so a missing/garbage field degrades to a sane
// default rather than crashing the screen.

// Digest options, verbatim from the route's VALID_DIGEST_FREQUENCIES enum.
export const DIGEST_FREQUENCIES = ["daily", "weekly", "monthly", "off"] as const;

export interface EmailPrefs {
  emailWelcome: boolean;
  emailGenerationComplete: boolean;
  emailDigestFrequency: string;
  quietHoursEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
}

export interface PushPrefs {
  pushGenerationComplete: boolean;
  pushNewFollower: boolean;
  pushSongComment: boolean;
}

function bool(r: Record<string, unknown>, k: string): boolean {
  return r?.[k] === true;
}

function int(r: Record<string, unknown>, k: string, fallback: number): number {
  return typeof r?.[k] === "number" ? (r[k] as number) : fallback;
}

function str(r: Record<string, unknown>, k: string, fallback: string): string {
  return typeof r?.[k] === "string" ? (r[k] as string) : fallback;
}

export async function fetchEmailPrefs(): Promise<EmailPrefs> {
  const r = await apiGet<Record<string, unknown>>("/api/profile/email-preferences");
  return {
    emailWelcome: bool(r, "emailWelcome"),
    emailGenerationComplete: bool(r, "emailGenerationComplete"),
    emailDigestFrequency: str(r, "emailDigestFrequency", "off"),
    quietHoursEnabled: bool(r, "quietHoursEnabled"),
    quietHoursStart: int(r, "quietHoursStart", 22),
    quietHoursEnd: int(r, "quietHoursEnd", 8),
  };
}

export async function updateEmailPrefs(patch: Partial<EmailPrefs>): Promise<void> {
  await apiPatch<unknown>("/api/profile/email-preferences", patch);
}

export async function fetchPushPrefs(): Promise<PushPrefs> {
  const r = await apiGet<Record<string, unknown>>("/api/push/preferences");
  return {
    pushGenerationComplete: bool(r, "pushGenerationComplete"),
    pushNewFollower: bool(r, "pushNewFollower"),
    pushSongComment: bool(r, "pushSongComment"),
  };
}

export async function updatePushPrefs(patch: Partial<PushPrefs>): Promise<void> {
  await apiPatch<unknown>("/api/push/preferences", patch);
}
