import { NextResponse } from "next/server";
import { z } from "zod";
import { publicRoute } from "@/lib/route-handler";
import { generateApiKey, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorized } from "@/lib/api-error";
import { rateLimitCheck } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/network";
import { logger } from "@/lib/logger";

// Brute-force caps (failures count): per IP (blunts credential-spray across many
// accounts) AND per email (protects a single account). Both run before any DB hit.
const AUTH_TOKEN_HOURLY_LIMIT = 10;
const AUTH_TOKEN_IP_HOURLY_LIMIT = 30;

/**
 * POST /api/v1/auth/token  (M004-S02-T01)
 *
 * Native-client login. Exchanges email + password for a long-lived SunoFlow
 * API key (`sk-...`). The mobile app stores the returned `key` in the device
 * keychain and sends it as `Authorization: Bearer sk-...` on every request --
 * which `resolveUser()` already authenticates (same path the MCP server uses),
 * so no new verification middleware is needed.
 *
 * Sign-out / rotation = revoke the key (DELETE /api/profile/api-keys/:id, or a
 * future /api/v1/auth/revoke). The raw key is returned exactly once; only its
 * SHA-256 hash is stored.
 *
 * Brute-force protected: per-IP AND per-email hourly rate limits (failed attempts
 * count), both before any DB lookup. Failures are generic 401s and the minted
 * credential is a REVOCABLE key, not a session.
 */
const tokenBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().trim().min(1).max(64).optional(),
});

export const POST = publicRoute(
  async (request, { body }) => {
    // Rate-limit BEFORE touching the DB. Per-IP first (catches spray), then per-email.
    const ipRl = await rateLimitCheck(
      `auth_token_ip:${getClientIp(request)}`,
      "auth_token_ip",
      AUTH_TOKEN_IP_HOURLY_LIMIT,
    );
    if (!ipRl.ok) return ipRl.response;

    const rl = await rateLimitCheck(
      `auth_token:${body.email.toLowerCase()}`,
      "auth_token",
      AUTH_TOKEN_HOURLY_LIMIT,
    );
    if (!rl.ok) return rl.response;

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      select: { id: true, email: true, passwordHash: true, isDisabled: true },
    });

    // Generic 401 in every failure branch — never reveal which of
    // user-exists / disabled / wrong-password was the cause (no enumeration).
    if (!user || !user.passwordHash || user.isDisabled) {
      logger.warn(
        { emailDomain: body.email.split("@")[1] },
        "auth/token: rejected — unknown, disabled, or password-less account",
      );
      return unauthorized("Invalid credentials");
    }

    const ok = await verifyPassword(body.password, user.passwordHash);
    if (!ok) {
      logger.warn({ userId: user.id }, "auth/token: rejected — wrong password");
      return unauthorized("Invalid credentials");
    }

    const { key, hash, prefix } = generateApiKey();
    const created = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: body.deviceName ?? "Mobile (iOS)",
        keyHash: hash,
        prefix,
      },
      select: { id: true, name: true, prefix: true, createdAt: true },
    });

    logger.info({ userId: user.id, keyId: created.id }, "auth/token: minted mobile API key");
    return NextResponse.json({ ...created, key }, { status: 201 });
  },
  { body: tokenBody },
);
