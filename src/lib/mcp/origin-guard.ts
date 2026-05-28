/**
 * Origin-header allowlist for the MCP HTTP endpoint.
 *
 * MCP spec (2025-06-18) — "Servers MUST validate the Origin header on all
 * incoming connections to prevent DNS rebinding attacks". This helper is
 * called before auth so unauthorized origins never reach the API key check.
 *
 * Default allowlist: claude.ai, anthropic.com, cursor.sh. Override at runtime
 * via the `MCP_ALLOWED_ORIGINS` env var (comma-separated). The special value
 * `*` disables the check (intended only for self-hosters who control their
 * own network boundary).
 *
 * Dev bypass: when `NODE_ENV=development` the check accepts missing Origin
 * headers so curl/Inspector probes from localhost work.
 */

const DEFAULT_ALLOWED = [
  "https://claude.ai",
  "https://desktop.anthropic.com",
  "https://app.cursor.sh",
  "https://cursor.sh",
];

function parseAllowed(): string[] | "*" {
  const raw = process.env.MCP_ALLOWED_ORIGINS?.trim();
  if (!raw) return DEFAULT_ALLOWED;
  if (raw === "*") return "*";
  return raw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

export interface OriginCheckResult {
  ok: boolean;
  origin: string | null;
  reason?: "missing" | "blocked";
  allowed?: readonly string[] | "*";
}

export function checkOrigin(req: Request): OriginCheckResult {
  const allowed = parseAllowed();
  const origin = req.headers.get("origin");
  const isDev =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

  if (allowed === "*") {
    return { ok: true, origin, allowed };
  }

  if (!origin) {
    // No Origin header — accept in dev (curl/Inspector), reject in prod.
    return isDev
      ? { ok: true, origin: null, allowed }
      : { ok: false, origin: null, reason: "missing", allowed };
  }

  if (allowed.includes(origin)) {
    return { ok: true, origin, allowed };
  }

  return { ok: false, origin, reason: "blocked", allowed };
}
