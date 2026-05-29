import { z } from "zod";
import { authRoute, successResponse } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/api-error";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const POST = authRoute(
  async (_request, { auth, body }) => {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return notFound("User not found");
    }

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) {
      return badRequest("Current password is incorrect");
    }

    const passwordHash = await hashPassword(body.newPassword);
    await prisma.user.update({
      where: { id: auth.userId },
      data: { passwordHash },
    });

    return successResponse();
  },
  { body: changePasswordBody },
);
