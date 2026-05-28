import { NextResponse } from "next/server";
import { z } from "zod";
import { authRoute } from "@/lib/route-handler";
import { badRequest, notFound } from "@/lib/api-error";
import { getUserOrNotFound } from "@/lib/profile/user";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const bodySchema = z.object({
  currentPassword: z.string().trim().min(1),
  newPassword: z.string().trim().min(1),
  confirmPassword: z.string().trim().min(1),
});

export const POST = authRoute<Record<string, never>, z.infer<typeof bodySchema>>(async (_request, { auth, body }) => {
  const { currentPassword, newPassword, confirmPassword } = body;

  if (newPassword.length < 8) {
    return badRequest("New password must be at least 8 characters");
  }

  if (newPassword !== confirmPassword) {
    return badRequest("Passwords do not match");
  }

  const userResult = await getUserOrNotFound(auth.userId, {
    passwordHash: true,
  });

  if (!userResult.ok) {
    return userResult.response;
  }

  if (!userResult.user.passwordHash) {
    return notFound("User not found");
  }

  const valid = await verifyPassword(currentPassword, userResult.user.passwordHash);
  if (!valid) {
    return badRequest("Current password is incorrect");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: auth.userId },
    data: { passwordHash },
  });

  return NextResponse.json({ success: true });
}, {
  route: "/api/profile/password",
  body: bodySchema,
});
