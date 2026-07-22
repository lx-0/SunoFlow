import { prisma } from "@/lib/prisma";
import { Err, type Result, success } from "@/lib/result";
import { canUseFeature, normalizeTier } from "@/lib/feature-gates";
import { stripHtml } from "@/lib/sanitize";

export const JAM_DEFAULT_BUDGET = 30;
export const JAM_MIN_BUDGET = 1;
export const JAM_MAX_BUDGET = 100;
const MAX_OPEN_SESSIONS = 3;

export interface JamSessionSummary {
  id: string;
  playlistId: string;
  shareToken: string;
  status: string;
  budgetTotal: number;
  budgetUsed: number;
  createdAt: Date;
  closedAt: Date | null;
}

const SESSION_SELECT = {
  id: true,
  playlistId: true,
  shareToken: true,
  status: true,
  budgetTotal: true,
  budgetUsed: true,
  createdAt: true,
  closedAt: true,
} as const;

/**
 * Opens a jam session for a STUDIO host: creates the session playlist and the
 * JamSession row (share token = guest access) in one transaction. Guests join
 * via the token without an account, so every guardrail lives server-side:
 * the budget caps total generations, MAX_OPEN_SESSIONS caps parallel parties.
 */
export async function createJamSession(
  userId: string,
  input: { name?: string; budgetTotal?: number },
): Promise<Result<{ session: JamSessionSummary }>> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { tier: true },
  });
  const tier = normalizeTier(subscription?.tier);
  if (!canUseFeature("jamSessions", tier)) {
    return Err.forbidden("Studio tier required");
  }

  const budgetTotal = input.budgetTotal ?? JAM_DEFAULT_BUDGET;
  if (
    !Number.isInteger(budgetTotal) ||
    budgetTotal < JAM_MIN_BUDGET ||
    budgetTotal > JAM_MAX_BUDGET
  ) {
    return Err.validation(
      `budgetTotal must be an integer between ${JAM_MIN_BUDGET} and ${JAM_MAX_BUDGET}`,
    );
  }

  const openCount = await prisma.jamSession.count({
    where: { hostUserId: userId, status: "open" },
  });
  if (openCount >= MAX_OPEN_SESSIONS) {
    return Err.limitReached(
      `Maximum of ${MAX_OPEN_SESSIONS} open jam sessions reached — close one first`,
    );
  }

  const name =
    (input.name ? stripHtml(input.name).trim() : "") ||
    `Jam Session ${new Date().toLocaleDateString("en-CA")}`;

  const session = await prisma.$transaction(async (tx) => {
    const playlist = await tx.playlist.create({
      data: { name, userId },
      select: { id: true },
    });
    return tx.jamSession.create({
      data: { hostUserId: userId, playlistId: playlist.id, budgetTotal },
      select: SESSION_SELECT,
    });
  });

  return success({ session });
}

/** Host's sessions, newest first (open ones before closed). */
export async function listJamSessions(
  userId: string,
): Promise<Result<{ sessions: (JamSessionSummary & { name: string })[] }>> {
  const rows = await prisma.jamSession.findMany({
    where: { hostUserId: userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: { ...SESSION_SELECT, playlist: { select: { name: true } } },
  });
  return success({
    sessions: rows.map(({ playlist, ...session }) => ({
      ...session,
      name: playlist.name,
    })),
  });
}

/** Host detail incl. shareToken (ownership-checked). */
export async function getJamSession(
  sessionId: string,
  userId: string,
): Promise<Result<{ session: JamSessionSummary & { name: string } }>> {
  const row = await prisma.jamSession.findFirst({
    where: { id: sessionId, hostUserId: userId },
    select: { ...SESSION_SELECT, playlist: { select: { name: true } } },
  });
  if (!row) return Err.notFound("Not found");
  const { playlist, ...session } = row;
  return success({ session: { ...session, name: playlist.name } });
}

/** Closes a session (idempotent — closing an already-closed session is a no-op). */
export async function closeJamSession(
  sessionId: string,
  userId: string,
): Promise<Result<{ session: JamSessionSummary }>> {
  const existing = await prisma.jamSession.findFirst({
    where: { id: sessionId, hostUserId: userId },
    select: SESSION_SELECT,
  });
  if (!existing) return Err.notFound("Not found");
  if (existing.status === "closed") return success({ session: existing });

  const session = await prisma.jamSession.update({
    where: { id: sessionId },
    data: { status: "closed", closedAt: new Date() },
    select: SESSION_SELECT,
  });
  return success({ session });
}

/**
 * Host veto: marks a pending entry as vetoed so the completion hook never
 * adds its song to the playlist/queue. A generation that is already running
 * is NOT cancelled — the budget stays consumed (accepted trade-off).
 */
export async function vetoJamEntry(
  sessionId: string,
  entryId: string,
  userId: string,
): Promise<Result<{ entry: { id: string; status: string } }>> {
  const session = await prisma.jamSession.findFirst({
    where: { id: sessionId, hostUserId: userId },
    select: { id: true },
  });
  if (!session) return Err.notFound("Not found");

  const existing = await prisma.jamSessionEntry.findFirst({
    where: { id: entryId, sessionId },
    select: { id: true, status: true },
  });
  if (!existing) return Err.notFound("Not found");
  if (existing.status !== "pending") {
    return Err.conflict("Only pending entries can be vetoed");
  }

  const entry = await prisma.jamSessionEntry.update({
    where: { id: entryId },
    data: { status: "vetoed" },
    select: { id: true, status: true },
  });
  return success({ entry });
}
