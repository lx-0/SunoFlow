import { prisma } from "@/lib/prisma";
import { Err, success, type Result } from "@/lib/result";
import { Prisma } from "@prisma/client";

export async function getUserOrNotFound<S extends Prisma.UserSelect>(
  userId: string,
  select: S,
): Promise<Result<Prisma.UserGetPayload<{ select: S }>>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select,
  });

  if (!user) {
    return Err.notFound("User not found");
  }

  return success(user);
}
