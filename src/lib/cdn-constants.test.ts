import { describe, expect, it } from "vitest";

import { isPermanentCdnUrl, PERMANENT_CDN_HOST } from "@/lib/cdn-constants";

describe("isPermanentCdnUrl", () => {
  it.each([
    { url: `https://${PERMANENT_CDN_HOST}/abc.mp3`, expected: true },
    { url: `http://${PERMANENT_CDN_HOST}/abc.mp3`, expected: true },
    { url: "https://tempfile.aiquickdraw.com/x/y.mp3", expected: false },
    // Host must match exactly — not appear as a path segment or a
    // subdomain-prefix of another host.
    { url: `https://evil.example/${PERMANENT_CDN_HOST}/x.mp3`, expected: false },
    { url: `https://${PERMANENT_CDN_HOST}.evil.example/x.mp3`, expected: false },
    { url: "not a url", expected: false },
    { url: "", expected: false },
    { url: null, expected: false },
    { url: undefined, expected: false },
  ])("$url → $expected", ({ url, expected }) => {
    expect(isPermanentCdnUrl(url)).toBe(expected);
  });
});
