import { NextResponse } from "next/server";
import { z } from "zod";
import { publicRoute } from "@/lib/route-handler";
import { generateApiKey, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorized } from "@/lib/api-error";
import { logger } from "@/lib/logger";

/**
 * POST /api/v1/auth/token  (M004-S02-T01)
 *
 * Native-client login. Exchanges email + password for a long-lived SunoFlow
 * API key (`sk-...`); the app stores it and sends it as `Authorization: Bearer
 * sk-...`, which `resolveUser()` already authenticates. The raw key is returned
 * once; only its SHA-256 hash is stored. Sign-out = revoke via
 * DELETE /api/profile/api-keys/:id.
 *
 * Brute-force: per-IP via the middleware "auth" bucket — this path is listed
 * in AUTH_PATHS (sliding-window.ts); it was silently UNCOVERED between the
 * per-email-cap rollback and 2026-07-18. A dedicated per-email login cap is
 * still future hardening, and must use the ANONYMOUS slot
 * (`acquireAnonRateLimitSlot`) — NOT the user-keyed `rateLimitCheck`, whose
 * `RateLimitEntry.userId` FK rejects synthetic (ip/email) keys and 500'd this
 * route. Failures are generic 401s.
 */
const tokenBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  deviceName: z.string().trim().min(1).max(64).optional(),
});

export const POST = publicRoute(
  async (_request, { body }) => {
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
