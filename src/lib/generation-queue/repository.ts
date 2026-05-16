import type { GenerationQueueItem } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Err, success } from "@/lib/result";
import type {
  AcquireResult,
  AddItemParams,
  AddItemResult,
  CancelResult,
  SongOutcome,
} from "./types";
import { MAX_QUEUE_SIZE } from "./types";

export async function listItems(userId: string): Promise<GenerationQueueItem[]> {
  return prisma.generationQueueItem.findMany({
    where: { userId, status: { in: ["pending", "processing"] } },
    orderBy: { position: "asc" },
  });
}

export async function addItem(
  userId: string,
  params: AddItemParams
): Promise<AddItemResult> {
  const pendingCount = await prisma.generationQueueItem.count({
    where: { userId, status: { in: ["pending", "processing"] } },
  });

  if (pendingCount >= MAX_QUEUE_SIZE) {
    return Err.limitReached(`Queue is full (max ${MAX_QUEUE_SIZE} items)`);
  }

  const lastItem = await prisma.generationQueueItem.findFirst({
    where: { userId },
    orderBy: { position: "desc" },
    select: { position: true },
  });
  const position = (lastItem?.position ?? -1) + 1;

  const item = await prisma.generationQueueItem.create({
    data: {
      userId,
      prompt: params.prompt.trim(),
      title: params.title?.trim() || null,
      tags: params.tags?.trim() || null,
      makeInstrumental: Boolean(params.makeInstrumental),
      personaId: params.personaId || null,
      position,
    },
  });

  return success({ item });
}

export async function cancelItem(userId: string, itemId: string): Promise<CancelResult> {
  const item = await prisma.generationQueueItem.findFirst({
    where: { id: itemId, userId },
  });

  if (!item) return Err.notFound("Not found");

  if (item.status === "processing") {
    await prisma.generationQueueItem.update({
      where: { id: itemId },
      data: { status: "cancelled" },
    });
  } else {
    await prisma.generationQueueItem.delete({ where: { id: itemId } });
  }

  return success({ success: true as const });
}

export async function reorderItems(userId: string, orderedIds: string[]): Promise<void> {
  const items = await prisma.generationQueueItem.findMany({
    where: { userId, status: "pending", id: { in: orderedIds } },
    select: { id: true },
  });

  const validIds = new Set(items.map((i) => i.id));
  const filteredIds = orderedIds.filter((id) => validIds.has(id));

  await prisma.$transaction(
    filteredIds.map((id, index) =>
      prisma.generationQueueItem.update({
        where: { id },
        data: { position: index },
      })
    )
  );
}

export async function acquireNextItem(userId: string): Promise<AcquireResult> {
  const processing = await prisma.generationQueueItem.findFirst({
    where: { userId, status: "processing" },
  });
  if (processing) return { status: "already_processing", item: processing };

  const next = await prisma.generationQueueItem.findFirst({
    where: { userId, status: "pending" },
    orderBy: { position: "asc" },
  });
  if (!next) return { status: "empty" };

  await updateItemById(next.id, { status: "processing" });

  return { status: "acquired", item: { ...next, status: "processing" } };
}

/**
 * Update a queue item by its primary key. The canonical way for the
 * workflow (drain, process-next, acquireNextItem) to advance an item's
 * status. Callers know the item id because they just acquired or
 * enqueued it.
 */
export function updateItemById(
  itemId: string,
  data: Partial<Pick<GenerationQueueItem, "status" | "songId" | "errorMessage">>,
): Promise<unknown> {
  return prisma.generationQueueItem.update({ where: { id: itemId }, data });
}

/**
 * Find the in-flight queue item for a song (matched by songId AND
 * status=processing) and close it. Called from the song-completion
 * side-effect chain where the only handle we have is the songId.
 *
 * If no row matches (e.g. the song wasn't enqueued; was generated
 * directly via /api/generate), this is a silent no-op.
 */
export async function resolveBySongId(
  songId: string,
  outcome: SongOutcome,
): Promise<void> {
  const data: Partial<Pick<GenerationQueueItem, "status" | "errorMessage">> =
    outcome.status === "done"
      ? { status: "done" }
      : { status: "failed", errorMessage: outcome.errorMessage };

  await prisma.generationQueueItem.updateMany({
    where: { songId, status: "processing" },
    data,
  });
}
