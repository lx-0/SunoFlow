import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { acquireRateLimitSlot } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" });
    }

    // Rate limit: max 3 verification emails per hour
    const { acquired } = await acquireRateLimitSlot(user.id, "verification_email");
    if (!acquired) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later.", code: "RATE_LIMIT" },
        { status: 429 }
      );
    }

    const verificationToken = crypto.randomUUID();

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    await sendVerificationEmail(user.email, verificationToken);

    return NextResponse.json({ message: "Verification email sent" });
  } catch (err) {
    logger.error({ err }, "resend-verification: error");
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
