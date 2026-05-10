import type { Song } from "@prisma/client";
import type { GenerationOutcome } from "@/lib/generation";
import { prisma } from "@/lib/prisma";
import { generateSong, mockSongs, resolveUserApiKey } from "@/lib/sunoapi";
import { executeGeneration } from "@/lib/generation";
import { type Result, success, Err } from "@/lib/result";

export const MAX_VARIATIONS = 5;

const VARIATION_SELECT = {
  id: true,
  title: true,
  prompt: true,
  tags: true,
  audioUrl: true,
  imageUrl: true,
  duration: true,
  lyrics: true,
  generationStatus: true,
  isInstrumental: true,
  createdAt: true,
} as const;

type VariationRow = Pick<
  Song,
  "id" | "title" | "prompt" | "tags" | "audioUrl" | "imageUrl" | "duration" | "lyrics" | "generationStatus" | "isInstrumental" | "createdAt"
>;

export interface VariationFamily {
  root: VariationRow | null;
  variations: VariationRow[];
  variationCount: number;
  maxVariations: number;
}

export interface VariationInput {
  prompt?: string;
  tags?: string;
  title?: string;
  makeInstrumental?: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers — testable without Prisma
// ---------------------------------------------------------------------------

export function normalizeVariationTags(rawTags: string): string {
  if (!rawTags) return "remix";
  return rawTags.toLowerCase().includes("remix") ? rawTags : `${rawTags}, remix`;
}

export function variationTitle(
  parentTitle: string | null,
  explicitTitle?: string,
): string | null {
  if (explicitTitle?.trim()) return explicitTitle.trim();
  if (parentTitle) return `${parentTitle} (variation)`;
  return null;
}

// ---------------------------------------------------------------------------
// Shared query — resolves the root of a variation chain
// ---------------------------------------------------------------------------

export async function resolveRootId(songId: string, parentSongId: string | null): Promise<string> {
  if (!parentSongId) return songId;

  let rootId = parentSongId;
  let current = await prisma.song.findUnique({
    where: { id: rootId },
    select: { parentSongId: true },
  });
  while (current?.parentSongId) {
    rootId = current.parentSongId;
    current = await prisma.song.findUnique({
      where: { id: rootId },
      select: { parentSongId: true },
    });
  }
  return rootId;
}

// ---------------------------------------------------------------------------
// GET — return the full variation family for a song
// ---------------------------------------------------------------------------

export async function getVariationFamily(
  userId: string,
  songId: string,
): Promise<Result<VariationFamily>> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.userId !== userId) return Err.notFound("Song not found");

  const rootId = await resolveRootId(songId, song.parentSongId);

  const root = rootId === songId
    ? song
    : await prisma.song.findUnique({ where: { id: rootId } });

  const variations = await prisma.song.findMany({
    where: { parentSongId: rootId },
    orderBy: { createdAt: "asc" },
    select: VARIATION_SELECT,
  });

  const rootRow: VariationRow | null = root
    ? {
        id: root.id,
        title: root.title,
        prompt: root.prompt,
        tags: root.tags,
        audioUrl: root.audioUrl,
        imageUrl: root.imageUrl,
        duration: root.duration,
        lyrics: root.lyrics,
        generationStatus: root.generationStatus,
        isInstrumental: root.isInstrumental,
        createdAt: root.createdAt,
      }
    : null;

  return success({
    root: rootRow,
    variations,
    variationCount: variations.length,
    maxVariations: MAX_VARIATIONS,
  });
}

// ---------------------------------------------------------------------------
// POST — create a new variation of a song
// ---------------------------------------------------------------------------

export async function createVariation(
  userId: string,
  parentId: string,
  input: VariationInput,
): Promise<Result<GenerationOutcome>> {
  const parentSong = await prisma.song.findUnique({ where: { id: parentId } });
  if (!parentSong || parentSong.userId !== userId) return Err.notFound("Song not found");

  const rootId = parentSong.parentSongId ?? parentId;

  const variationCount = await prisma.song.count({
    where: { parentSongId: rootId },
  });
  if (variationCount >= MAX_VARIATIONS) {
    return Err.limitReached(`Maximum ${MAX_VARIATIONS} variations per song reached.`);
  }

  const prompt = (input.prompt?.trim() || parentSong.prompt || "").trim();
  if (!prompt) return Err.validation("A prompt is required");

  const rawTags = (input.tags?.trim() || parentSong.tags || "").trim();
  const tags = normalizeVariationTags(rawTags);
  const title = variationTitle(parentSong.title, input.title);
  const makeInstrumental = input.makeInstrumental ?? parentSong.isInstrumental;

  const userApiKey = await resolveUserApiKey(userId);
  const hasApiKey = !!(userApiKey || process.env.SUNOAPI_KEY);

  const outcome = await executeGeneration({
    userId,
    action: "generate",
    songParams: {
      title: title || null,
      prompt,
      tags: tags || null,
      isInstrumental: Boolean(makeInstrumental),
      parentSongId: rootId,
    },
    hasApiKey,
    mockFallback: mockSongs[0],
    description: `Variation generation: ${title || "Untitled"}`,
    apiCall: () =>
      generateSong(
        prompt,
        { title: title || undefined, style: tags || undefined, instrumental: Boolean(makeInstrumental) },
        userApiKey,
      ),
  });

  return success(outcome);
}
