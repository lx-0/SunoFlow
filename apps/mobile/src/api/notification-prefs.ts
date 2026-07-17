import { asBool, asNumber, asRecord, asString } from "@sunoflow/core";
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

export async function fetchEmailPrefs(): Promise<EmailPrefs> {
  const r = asRecord(await apiGet<unknown>("/api/profile/email-preferences")) ?? {};
  return {
    emailWelcome: asBool(r.emailWelcome),
    emailGenerationComplete: asBool(r.emailGenerationComplete),
    emailDigestFrequency: asString(r.emailDigestFrequency) ?? "off",
    quietHoursEnabled: asBool(r.quietHoursEnabled),
    quietHoursStart: asNumber(r.quietHoursStart, 22),
    quietHoursEnd: asNumber(r.quietHoursEnd, 8),
  };
}

export async function updateEmailPrefs(patch: Partial<EmailPrefs>): Promise<void> {
  await apiPatch<unknown>("/api/profile/email-preferences", patch);
}

export async function fetchPushPrefs(): Promise<PushPrefs> {
  const r = asRecord(await apiGet<unknown>("/api/push/preferences")) ?? {};
  return {
    pushGenerationComplete: asBool(r.pushGenerationComplete),
    pushNewFollower: asBool(r.pushNewFollower),
    pushSongComment: asBool(r.pushSongComment),
  };
}

export async function updatePushPrefs(patch: Partial<PushPrefs>): Promise<void> {
  await apiPatch<unknown>("/api/push/preferences", patch);
}
