/**
 * Auth middleware for the SunoFlow MCP server (stdio transport).
 *
 * For stdio, the API key is passed as the SUNOFLOW_API_KEY environment variable
 * when the host (e.g. Claude Desktop) spawns this process.
 */

import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

/**
 * Resolve a userId from the SUNOFLOW_API_KEY environment variable.
 * Returns the userId if the key is valid and not revoked, null otherwise.
 * Updates lastUsedAt fire-and-forget on success.
 */
export async function resolveApiKeyFromEnv(): Promise<string | null> {
  const rawKey = process.env.SUNOFLOW_API_KEY;
  if (!rawKey || !rawKey.startsWith("sk-")) return null;

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findFirst({
    where: { keyHash, revokedAt: null },
    select: { id: true, userId: true },
  });

  if (!apiKey) return null;

  // Fire-and-forget lastUsedAt update
  prisma.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});

  return apiKey.userId;
}
