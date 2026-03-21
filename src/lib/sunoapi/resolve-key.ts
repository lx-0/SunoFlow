import { prisma } from "@/lib/prisma";

/**
 * Resolve the Suno API key for a user.
 * Returns the user's personal key if set, otherwise undefined (caller falls back to env var).
 */
export async function resolveUserApiKey(userId: string): Promise<string | undefined> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sunoApiKey: true },
  });
  return user?.sunoApiKey ?? undefined;
}
