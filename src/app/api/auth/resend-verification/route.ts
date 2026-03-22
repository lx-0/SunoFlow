import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { checkRateLimit, recordRateLimitHit } from "@/lib/rate-limit";
import { sendVerificationEmail } from "@/lib/email";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user || !user.email) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email already verified" });
    }

    // Rate limit: max 3 verification emails per hour
    const { allowed } = await checkRateLimit(user.id, "verification_email");
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const verificationToken = crypto.randomUUID();

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken },
    });

    await recordRateLimitHit(user.id, "verification_email");
    await sendVerificationEmail(user.email, verificationToken);

    return NextResponse.json({ message: "Verification email sent" });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
