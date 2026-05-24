import { authDataRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";

export const POST = authDataRoute(async (_request, { auth }) => {
  await prisma.user.update({
    where: { id: auth.userId },
    data: { onboardingCompleted: true },
  });

  return { success: true };
});
