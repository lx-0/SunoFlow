import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicRoute } from "@/lib/route-handler";
import { badRequest } from "@/lib/api-error";
import { clearPasswordResetTokenData } from "@/lib/auth/tokens";
import { hashPassword } from "@/lib/auth/password";

const resetPasswordBody = z.object({
  token: z.string().trim().min(1, "Token is required"),
  password: z.string().trim().min(8, "Password must be at least 8 characters"),
});

export const POST = publicRoute<Record<string, never>, z.infer<typeof resetPasswordBody>>(
  async (_request, { body }) => {
    const { token, password } = body;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      return badRequest("Invalid or expired reset token");
    }

    const passwordHash = await hashPassword(password);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        ...clearPasswordResetTokenData(),
      },
    });

    return NextResponse.json({ message: "Password reset successfully" });
  },
  {
    body: resetPasswordBody,
    route: "/api/auth/reset-password",
  }
);
