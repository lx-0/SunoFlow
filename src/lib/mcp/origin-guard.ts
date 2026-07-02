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
 * Requests WITHOUT an Origin header are accepted: only browsers send Origin,
 * and a DNS-rebinding attack always carries the attacker page's Origin — a
 * missing header cannot be a rebinding vector. Non-browser MCP clients
 * (Claude Code CLI, SDKs, curl) never send Origin; auth is enforced
 * separately by the API-key check that runs after this guard (#117).
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
  reason?: "blocked";
  allowed?: readonly string[] | "*";
}

export function checkOrigin(req: Request): OriginCheckResult {
  const allowed = parseAllowed();
  const origin = req.headers.get("origin");

  if (allowed === "*") {
    return { ok: true, origin, allowed };
  }

  if (!origin) {
    // No Origin header — non-browser client (CLI/SDK/curl). Accept; the
    // API-key check downstream is the auth boundary.
    return { ok: true, origin: null, allowed };
  }

  if (allowed.includes(origin)) {
    return { ok: true, origin, allowed };
  }

  return { ok: false, origin, reason: "blocked", allowed };
}
