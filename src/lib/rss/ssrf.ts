import net from "node:net";
import { lookup } from "node:dns/promises";

// SSRF defense for outbound RSS/article fetches.
//
// `isSsrfUrl` is the cheap, synchronous structural check (protocol + literal
// hostname regexes). It cannot see through numeric/encoded IPs
// (http://2130706433/, http://0x7f000001/) or DNS names that resolve to
// private space, so it is only a first pass.
//
// `isSsrfUrlResolved` is the authoritative guard for the authenticated fetch
// route: it requires https, rejects non-default ports, and — crucially —
// resolves the hostname via DNS and rejects if ANY resolved address falls in a
// private/reserved range. Call it on the initial URL AND on every redirect hop.

/** True if a bare IPv4 literal is loopback / private / link-local / reserved. */
function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return true; // malformed → treat as unsafe
  const octets = parts.map((p) => Number(p));
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = octets;
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10/8
  if (a === 127) return true; // 127/8 loopback
  if (a === 169 && b === 254) return true; // 169.254/16 link-local + metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12
  if (a === 192 && b === 168) return true; // 192.168/16
  return false;
}

/** True if a resolved IP literal (v4 or v6) is in a private/reserved range. */
export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) return isPrivateIpv4(ip);
  if (version === 6) {
    const lower = ip.toLowerCase();
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — check the embedded v4 address.
    const mappedV4 = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mappedV4) return isPrivateIpv4(mappedV4[1]);
    // IPv4-mapped IPv6 in hex form (::ffff:7f00:1).
    const mappedHex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16);
      const lo = parseInt(mappedHex[2], 16);
      return isPrivateIpv4(
        `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`
      );
    }
    if (lower === "::1" || lower === "::") return true; // loopback / unspecified
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true; // fc00::/7 unique-local
    if (/^fe[89ab][0-9a-f]:/.test(lower)) return true; // fe80::/10 link-local
    return false;
  }
  return true; // not a valid IP literal → unsafe
}

/**
 * Synchronous structural SSRF check. Blocks non-http(s) schemes, unparseable
 * URLs, and literal private/loopback/link-local hostnames. Retained for the
 * article-extraction path and as a first pass; NOT sufficient on its own
 * because it does no DNS resolution. Returns true = block.
 */
export function isSsrfUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return true;
  if (/^169\.254\./.test(hostname)) return true;
  if (/^10\./.test(hostname) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname) || /^192\.168\./.test(hostname)) return true;
  const bare = hostname.replace(/^\[|\]$/g, "");
  if (bare === "::1") return true;
  if (/^(fc[0-9a-f]{2}:|fd[0-9a-f]{2}:)/i.test(bare)) return true;
  const v4Mapped = bare.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (v4Mapped) {
    const hi = parseInt(v4Mapped[1], 16);
    const lo = parseInt(v4Mapped[2], 16);
    const ip = `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
    return isSsrfUrl(`http://${ip}/`);
  }
  return false;
}

/**
 * Authoritative async SSRF guard for the authenticated fetch route. Enforces
 * https-only, default port only, and DNS-resolves the hostname — rejecting if
 * ANY resolved address is private/reserved. This closes numeric/encoded-IP and
 * DNS-name bypasses that the sync check misses. Must be re-run on each redirect
 * hop so a 30x to an internal host is caught. Returns true = block.
 */
export async function isSsrfUrlResolved(raw: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return true;
  }
  // Defense in depth: public HTTPS only — drop http:// entirely.
  if (url.protocol !== "https:") return true;
  // Reject non-default ports (default https port is 443; URL leaves it empty).
  if (url.port !== "" && url.port !== "443") return true;

  const host = url.hostname.replace(/^\[|\]$/g, "");
  // Literal IP host — no DNS needed, check directly.
  if (net.isIP(host) !== 0) return isPrivateIp(host);

  // Hostname (incl. numeric/hex forms getaddrinfo understands): resolve every
  // address and block if any is private/reserved.
  let addresses: { address: string }[];
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    return true; // resolution failure → block
  }
  if (addresses.length === 0) return true;
  return addresses.some((a) => isPrivateIp(a.address));
}
