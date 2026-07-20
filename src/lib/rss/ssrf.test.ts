import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DNS resolution so the async guard is deterministic and offline.
const lookupMock = vi.fn();
vi.mock("node:dns/promises", () => ({
  lookup: (...args: unknown[]) => lookupMock(...args),
}));

import { isPrivateIp, isSsrfUrl, isSsrfUrlResolved } from "./ssrf";

describe("isPrivateIp", () => {
  it("flags loopback / private / link-local / reserved v4", () => {
    for (const ip of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  it("passes public v4", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("93.184.216.34")).toBe(false);
  });

  it("flags loopback / unique-local / link-local v6 (incl. v4-mapped)", () => {
    for (const ip of ["::1", "fc00::1", "fd12::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1"]) {
      expect(isPrivateIp(ip)).toBe(true);
    }
  });

  it("passes public v6", () => {
    expect(isPrivateIp("2606:4700::1")).toBe(false);
  });
});

describe("isSsrfUrlResolved", () => {
  beforeEach(() => {
    lookupMock.mockReset();
  });

  it("rejects http:// (https-only defense in depth)", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    expect(await isSsrfUrlResolved("http://example.com/feed.xml")).toBe(true);
    // https for the same public host is allowed.
    expect(await isSsrfUrlResolved("https://example.com/feed.xml")).toBe(false);
  });

  it("rejects non-default ports", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    expect(await isSsrfUrlResolved("https://example.com:8443/feed.xml")).toBe(true);
  });

  it("rejects a hostname that resolves to a loopback IP (DNS-rebinding / numeric-IP bypass)", async () => {
    lookupMock.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    expect(await isSsrfUrlResolved("https://rebind.evil.com/feed.xml")).toBe(true);
  });

  it("rejects when ANY resolved address is private", async () => {
    lookupMock.mockResolvedValue([
      { address: "93.184.216.34", family: 4 },
      { address: "169.254.169.254", family: 4 },
    ]);
    expect(await isSsrfUrlResolved("https://mixed.evil.com/feed.xml")).toBe(true);
  });

  it("rejects when DNS resolution fails", async () => {
    lookupMock.mockRejectedValue(new Error("ENOTFOUND"));
    expect(await isSsrfUrlResolved("https://nxdomain.example/feed.xml")).toBe(true);
  });

  it("allows a normal public https feed (resolving to a public IP)", async () => {
    lookupMock.mockResolvedValue([{ address: "93.184.216.34", family: 4 }]);
    expect(await isSsrfUrlResolved("https://news.example.com/feed.xml")).toBe(false);
  });

  it("rejects a private literal IP without hitting DNS", async () => {
    expect(await isSsrfUrlResolved("https://127.0.0.1/feed.xml")).toBe(true);
    expect(await isSsrfUrlResolved("https://[::1]/feed.xml")).toBe(true);
    expect(lookupMock).not.toHaveBeenCalled();
  });

  it("rejects unparseable URLs", async () => {
    expect(await isSsrfUrlResolved("not-a-url")).toBe(true);
  });
});

// Ensure the moved sync guard keeps its original behavior via re-export.
describe("isSsrfUrl (sync, structural)", () => {
  it("blocks literal private/loopback and non-http(s), allows public http+https", () => {
    expect(isSsrfUrl("http://169.254.169.254/latest")).toBe(true);
    expect(isSsrfUrl("file:///etc/passwd")).toBe(true);
    expect(isSsrfUrl("https://example.com/article")).toBe(false);
    expect(isSsrfUrl("http://blog.example.org/post")).toBe(false);
  });
});
