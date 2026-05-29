import { z } from "zod";
import { authRoute, successResponse } from "@/lib/route-handler";
import { badRequest, notFound } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";

export const DELETE = authRoute(async (_request, { auth, body }) => {
  const { password, confirmEmail } = body;

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { email: true, passwordHash: true },
  });

  if (!user) {
    return notFound("User not found");
  }

  if (!user.passwordHash) {
    return badRequest("Account deletion requires a password. Use your account provider to delete OAuth-only accounts.");
  }

  if (confirmEmail !== user.email) {
    return badRequest("Email does not match your account");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return badRequest("Password is incorrect");
  }

  await prisma.user.delete({ where: { id: auth.userId } });

  return successResponse();
}, {
  route: "/api/account",
  body: z.object({
    password: z.string().min(1),
    confirmEmail: z.string().email(),
  }),
});
