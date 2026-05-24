import { afterAll, describe, expect, it } from "vitest";
import { getSiteUrl, getSiteUrlObject } from "@/lib/site-url";

describe("site-url", () => {
  const original = process.env.NEXT_PUBLIC_SITE_URL;

  it("returns configured NEXT_PUBLIC_SITE_URL when present", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://example.com";
    expect(getSiteUrl()).toBe("https://example.com");
    expect(getSiteUrlObject().toString()).toBe("https://example.com/");
  });

  it("falls back to default site URL when missing", () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    expect(getSiteUrl()).toBe("https://sunoflow.app");
    expect(getSiteUrlObject().toString()).toBe("https://sunoflow.app/");
  });

  afterAll(() => {
    if (original == null) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = original;
    }
  });
});
