/**
 * Test-only tier grant for Playwright E2E tests (companion to /api/test/login).
 * Tier-gated UI (e.g. the jam-session button) is otherwise untestable — the
 * shared E2E user registers as free and Stripe is not part of the test loop.
 *
 * IMPORTANT: Only active when PLAYWRIGHT_TEST=true. Returns 404 otherwise.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { publicRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";

const grantTierSchema = z.object({
  email: z.string().email(),
  tier: z.enum(["free", "starter", "pro", "studio"]),
});

export const POST = publicRoute<
  Record<string, never>,
  z.infer<typeof grantTierSchema>
>(async (_req: NextRequest, { body }) => {
  if (process.env.PLAYWRIGHT_TEST !== "true") {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Unknown user" }, { status: 404 });
  }

  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { tier: body.tier, status: "active" },
    create: {
      userId: user.id,
      tier: body.tier,
      status: "active",
      stripeCustomerId: `test_cus_${user.id}`,
      stripeSubscriptionId: `test_sub_${user.id}`,
      stripePriceId: "test_price",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ ok: true });
}, {
  body: grantTierSchema,
});
