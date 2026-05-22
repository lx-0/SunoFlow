import { notFound } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type UserLookupResult<T> =
  | { ok: true; user: T }
  | { ok: false; response: Response };

export async function getUserOrNotFound<S extends Prisma.UserSelect>(
  userId: string,
  select: S,
): Promise<UserLookupResult<Prisma.UserGetPayload<{ select: S }>>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select,
  });

  if (!user) {
    return { ok: false, response: notFound("User not found") };
  }

  return { ok: true, user };
}
