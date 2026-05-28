/**
 * Auth middleware for the SunoFlow MCP server.
 *
 * Supports two entry points:
 * - stdio transport: API key from SUNOFLOW_API_KEY env var
 * - HTTP transport: API key from `Authorization: Bearer ...` request header
 *
 * Both paths share the same lookup + hash + lastUsedAt-update logic.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

async function resolveApiKey(
  rawKey: string | null | undefined,
): Promise<string | null> {
  if (!rawKey || !rawKey.startsWith("sk-")) return null;

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    select: { id: true, userId: true },
  });

  if (!apiKey) return null;

  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return apiKey.userId;
}

/**
 * Resolve a userId from the SUNOFLOW_API_KEY environment variable.
 * Returns the userId if the key is valid and not revoked, null otherwise.
 */
export async function resolveApiKeyFromEnv(): Promise<string | null> {
  return resolveApiKey(process.env.SUNOFLOW_API_KEY);
}

/**
 * Resolve a userId from an `Authorization: Bearer sk-...` header value.
 * Returns the userId if the key is valid and not revoked, null otherwise.
 * Returns null for missing header, malformed scheme, or unknown/revoked keys.
 */
export async function resolveApiKeyFromHeader(
  authHeader: string | null | undefined,
): Promise<string | null> {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  return resolveApiKey(match[1].trim());
}
