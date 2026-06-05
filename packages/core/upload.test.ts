import { describe, it, expect } from "vitest";
import { uploadBodySchema, MAX_BASE64_SIZE } from "./upload";

describe("uploadBodySchema", () => {
  it("accepts cover with base64 and extend with a URL", () => {
    expect(uploadBodySchema.safeParse({ mode: "cover", base64Data: "abc" }).success).toBe(true);
    expect(uploadBodySchema.safeParse({ mode: "extend", fileUrl: "https://x/a.mp3" }).success).toBe(true);
  });

  it("rejects an invalid mode", () => {
    expect(uploadBodySchema.safeParse({ mode: "remix", base64Data: "abc" }).success).toBe(false);
  });

  it("requires exactly one of base64Data / fileUrl", () => {
    expect(uploadBodySchema.safeParse({ mode: "cover" }).success).toBe(false);
    expect(uploadBodySchema.safeParse({ mode: "cover", base64Data: "abc", fileUrl: "https://x" }).success).toBe(false);
  });

  it("rejects base64 payloads over the size cap", () => {
    // decoded bytes ≈ len * 3/4; pick a length whose decoded size exceeds the cap.
    const tooLong = "a".repeat(Math.ceil((MAX_BASE64_SIZE * 4) / 3) + 8);
    expect(uploadBodySchema.safeParse({ mode: "cover", base64Data: tooLong }).success).toBe(false);
  });
});
