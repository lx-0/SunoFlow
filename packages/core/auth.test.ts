import { describe, it, expect } from "vitest";
import { changePasswordBody } from "./auth";

describe("changePasswordBody", () => {
  it("accepts a valid matching change", () => {
    expect(
      changePasswordBody.safeParse({
        currentPassword: "old-pass",
        newPassword: "new-secret",
        confirmPassword: "new-secret",
      }).success,
    ).toBe(true);
  });

  it("rejects a new password under 8 characters", () => {
    const r = changePasswordBody.safeParse({ currentPassword: "x", newPassword: "short", confirmPassword: "short" });
    expect(r.success).toBe(false);
  });

  it("rejects a confirm mismatch, pointing at confirmPassword", () => {
    const r = changePasswordBody.safeParse({ currentPassword: "x", newPassword: "new-secret", confirmPassword: "different" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toContain("confirmPassword");
  });

  it("requires the current password", () => {
    expect(
      changePasswordBody.safeParse({ currentPassword: "", newPassword: "new-secret", confirmPassword: "new-secret" }).success,
    ).toBe(false);
  });
});
