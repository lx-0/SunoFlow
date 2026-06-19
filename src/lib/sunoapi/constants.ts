import { DEFAULT_SUNO_MODEL } from "@sunoflow/core";
import { WEBHOOK_BASE_URL, SUNO_WEBHOOK_SECRET } from "@/lib/env";

export const BASE_URL = "https://api.sunoapi.org/api/v1";
export const FILE_UPLOAD_BASE_URL = "https://sunoapiorg.redpandaai.co";

const NOOP_CALLBACK_URL = "https://localhost/noop";

export function getCallbackUrl(): string {
  if (!SUNO_WEBHOOK_SECRET) return NOOP_CALLBACK_URL;
  const base = WEBHOOK_BASE_URL.replace(/\/+$/, "");
  return `${base}/api/webhooks/suno?token=${encodeURIComponent(SUNO_WEBHOOK_SECRET)}`;
}

// Single source: the default model lives in @sunoflow/core (drives prompt limits
// across server + clients).
export const DEFAULT_MODEL = DEFAULT_SUNO_MODEL;
