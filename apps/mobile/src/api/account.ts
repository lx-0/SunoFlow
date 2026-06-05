import { changePasswordBody, type ChangePasswordBody } from "@sunoflow/core";
import { apiGet, apiPost, apiDelete } from "./client";

// Account actions. Change-password validates against the SHARED @sunoflow/core
// schema (same the web route uses), so client + server agree on the rules.

export async function changePassword(body: ChangePasswordBody): Promise<void> {
  const parsed = changePasswordBody.safeParse(body);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid input");
  }
  await apiPost("/api/auth/change-password", parsed.data);
}

/** GET /api/export → the user's data (JSON by default). */
export async function exportUserData(): Promise<unknown> {
  return apiGet<unknown>("/api/export");
}

/** DELETE /api/account — requires the password + the user's own email as confirmation. */
export async function deleteAccount(password: string, confirmEmail: string): Promise<void> {
  await apiDelete("/api/account", { password, confirmEmail });
}
