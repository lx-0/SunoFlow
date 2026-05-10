import type { Song } from "@prisma/client";
import type { GenerationOutcome } from "@/lib/generation";
import { prisma } from "@/lib/prisma";
import {
  generateSong,
  extendMusic,
  addVocals as sunoAddVocals,
  addInstrumental as sunoAddInstrumental,
  replaceSection as sunoReplaceSection,
  mockSongs,
  resolveUserApiKey,
} from "@/lib/sunoapi";
import { executeGeneration } from "@/lib/generation";
import { sanitizeText } from "@/lib/sanitize";
import { type Result, success, Err } from "@/lib/result";

export const MAX_VARIATIONS = 5;

const MIN_SECTION_S = 6;
const MAX_SECTION_S = 60;
const MAX_SECTION_RATIO = 0.5;

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

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

export interface AddVocalsInput {
  prompt: string;
  style?: string;
  title?: string;
}

export interface AddInstrumentalInput {
  tags?: string;
  title?: string;
}

export interface ReplaceSectionInput {
  prompt: string;
  tags?: string;
  title?: string;
  infillStartS: number;
  infillEndS: number;
  negativeTags?: string;
}

export interface ExtendSongInput {
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
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
// Shared parent resolution — the single place that resolves a parent song,
// enforces ownership, checks the variation limit, and resolves the API key.
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

interface ParentContext {
  parentSong: NonNullable<Awaited<ReturnType<typeof prisma.song.findUnique>>>;
  rootId: string;
  userApiKey: string | undefined;
  hasApiKey: boolean;
}

async function resolveParent(
  userId: string,
  parentSongId: string,
): Promise<Result<ParentContext>> {
  const parentSong = await prisma.song.findUnique({ where: { id: parentSongId } });
  if (!parentSong || parentSong.userId !== userId) {
    return Err.notFound("Song not found");
  }

  const rootId = parentSong.parentSongId ?? parentSongId;

  const variationCount = await prisma.song.count({ where: { parentSongId: rootId } });
  if (variationCount >= MAX_VARIATIONS) {
    return Err.limitReached(`Maximum ${MAX_VARIATIONS} variations per song reached.`);
  }

  const userApiKey = await resolveUserApiKey(userId);
  const hasApiKey = !!(userApiKey || process.env.SUNOAPI_KEY);

  return success({ parentSong, rootId, userApiKey, hasApiKey });
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
// Create variation (generic)
// ---------------------------------------------------------------------------

export async function createVariation(
  userId: string,
  parentId: string,
  input: VariationInput,
): Promise<Result<GenerationOutcome>> {
  const ctx = await resolveParent(userId, parentId);
  if (!ctx.ok) return ctx;
  const { parentSong, rootId, userApiKey, hasApiKey } = ctx.data;

  const prompt = (input.prompt?.trim() || parentSong.prompt || "").trim();
  if (!prompt) return Err.validation("A prompt is required");

  const rawTags = (input.tags?.trim() || parentSong.tags || "").trim();
  const tags = normalizeVariationTags(rawTags);
  const title = variationTitle(parentSong.title, input.title);
  const makeInstrumental = input.makeInstrumental ?? parentSong.isInstrumental;

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

// ---------------------------------------------------------------------------
// Add Vocals
// ---------------------------------------------------------------------------

export async function addVocals(
  userId: string,
  parentSongId: string,
  input: AddVocalsInput,
): Promise<Result<GenerationOutcome>> {
  const ctx = await resolveParent(userId, parentSongId);
  if (!ctx.ok) return ctx;
  const { parentSong, rootId, userApiKey, hasApiKey } = ctx.data;

  if (!parentSong.isInstrumental) {
    return Err.validation("Add vocals is only available for instrumental tracks.");
  }

  const promptResult = sanitizeText(input.prompt, "prompt");
  if (!promptResult.value) {
    return Err.validation("A prompt describing the vocals is required.");
  }
  if (promptResult.error) {
    return Err.validation(promptResult.error);
  }
  const prompt = promptResult.value;

  let style = parentSong.tags || "";
  if (input.style !== undefined && input.style !== null) {
    const { value, error } = sanitizeText(input.style, "style", 500);
    if (error) return Err.validation(error);
    style = value;
  }

  let title: string | null = parentSong.title ? `${parentSong.title} (with vocals)` : null;
  if (input.title !== undefined && input.title !== null) {
    const { value, error } = sanitizeText(input.title, "title");
    if (error) return Err.validation(error);
    title = value || title;
  }

  if (hasApiKey && !parentSong.audioUrl) {
    return Err.validation("Parent song has no audio URL to add vocals to.");
  }

  const outcome = await executeGeneration({
    userId,
    action: "generate",
    songParams: {
      title: title || null,
      prompt,
      tags: style || null,
      isInstrumental: false,
      parentSongId: rootId,
    },
    hasApiKey,
    mockFallback: mockSongs[0],
    description: `Add vocals: ${title || "Untitled"}`,
    apiCall: () => sunoAddVocals(
      {
        uploadUrl: parentSong.audioUrl!,
        prompt,
        title: title || "Untitled",
        style: style || "pop",
      },
      userApiKey,
    ),
  });

  return success(outcome);
}

// ---------------------------------------------------------------------------
// Add Instrumental
// ---------------------------------------------------------------------------

export async function addInstrumental(
  userId: string,
  parentSongId: string,
  input: AddInstrumentalInput,
): Promise<Result<GenerationOutcome>> {
  const ctx = await resolveParent(userId, parentSongId);
  if (!ctx.ok) return ctx;
  const { parentSong, rootId, userApiKey, hasApiKey } = ctx.data;

  if (parentSong.isInstrumental) {
    return Err.validation("Add instrumental is only available for vocal tracks.");
  }

  let tags = (parentSong.tags || "").trim();
  if (input.tags !== undefined && input.tags !== null) {
    const { value, error } = sanitizeText(input.tags, "tags", 500);
    if (error) return Err.validation(error);
    tags = value;
  }

  if (!tags) {
    return Err.validation("Style tags are required for instrumental generation.");
  }

  let title: string | null = parentSong.title ? `${parentSong.title} (instrumental)` : null;
  if (input.title !== undefined && input.title !== null) {
    const { value, error } = sanitizeText(input.title, "title");
    if (error) return Err.validation(error);
    title = value || title;
  }

  if (hasApiKey && !parentSong.audioUrl) {
    return Err.validation("Parent song has no audio URL to generate instrumental from.");
  }

  const mock = mockSongs[0];
  const outcome = await executeGeneration({
    userId,
    action: "generate",
    songParams: {
      title,
      prompt: parentSong.prompt || "",
      tags,
      isInstrumental: true,
      parentSongId: rootId,
    },
    apiCall: () => sunoAddInstrumental(
      { uploadUrl: parentSong.audioUrl!, title: title || "Untitled", tags },
      userApiKey,
    ),
    mockFallback: {
      title: mock.title,
      tags: mock.tags,
      audioUrl: mock.audioUrl,
      imageUrl: mock.imageUrl,
      duration: mock.duration,
      model: mock.model,
    },
    hasApiKey,
    guards: "free",
    description: "add-instrumental",
  });

  return success(outcome);
}

// ---------------------------------------------------------------------------
// Replace Section
// ---------------------------------------------------------------------------

export async function replaceSection(
  userId: string,
  parentSongId: string,
  input: ReplaceSectionInput,
): Promise<Result<GenerationOutcome>> {
  const ctx = await resolveParent(userId, parentSongId);
  if (!ctx.ok) return ctx;
  const { parentSong, rootId, userApiKey, hasApiKey } = ctx.data;

  const prompt = (input.prompt ?? "").trim();
  const tags = (input.tags ?? parentSong.tags ?? "").trim();
  const title = (input.title ?? "").trim() || (parentSong.title ? `${parentSong.title} (section replaced)` : null);
  const { infillStartS, infillEndS } = input;
  const negativeTags = input.negativeTags?.trim() || undefined;

  if (infillStartS == null || infillEndS == null) {
    return Err.validation("Start and end times are required.");
  }
  if (infillStartS < 0 || infillEndS <= infillStartS) {
    return Err.validation("Invalid time range. End must be after start.");
  }
  const sectionLen = infillEndS - infillStartS;
  if (sectionLen < MIN_SECTION_S) {
    return Err.validation(`Section must be at least ${MIN_SECTION_S} seconds.`);
  }
  if (sectionLen > MAX_SECTION_S) {
    return Err.validation(`Section must be at most ${MAX_SECTION_S} seconds.`);
  }
  if (parentSong.duration && sectionLen > parentSong.duration * MAX_SECTION_RATIO) {
    return Err.validation("Section must be at most 50% of the song duration.");
  }

  if (!prompt) {
    return Err.validation("A replacement prompt is required.");
  }
  if (!tags) {
    return Err.validation("Style tags are required.");
  }

  if (hasApiKey && (!parentSong.sunoJobId || !parentSong.sunoAudioId)) {
    return Err.validation("Cannot replace section on a song without Suno identifiers.");
  }

  const mock = mockSongs[0];
  const outcome = await executeGeneration({
    userId,
    action: "generate",
    songParams: {
      title,
      prompt,
      tags,
      isInstrumental: parentSong.isInstrumental,
      parentSongId: rootId,
    },
    apiCall: () => sunoReplaceSection(
      {
        taskId: parentSong.sunoJobId!,
        audioId: parentSong.sunoAudioId!,
        prompt,
        tags,
        title: title || parentSong.title || "Untitled",
        infillStartS,
        infillEndS,
        negativeTags,
      },
      userApiKey,
    ),
    mockFallback: {
      title: mock.title,
      tags: mock.tags,
      audioUrl: mock.audioUrl,
      imageUrl: mock.imageUrl,
      duration: mock.duration,
      lyrics: mock.lyrics,
      model: mock.model,
    },
    hasApiKey,
    guards: "free",
    description: "replace-section",
  });

  return success(outcome);
}

// ---------------------------------------------------------------------------
// Extend Song
// ---------------------------------------------------------------------------

export async function extendSong(
  userId: string,
  parentSongId: string,
  input: ExtendSongInput,
): Promise<Result<GenerationOutcome>> {
  const ctx = await resolveParent(userId, parentSongId);
  if (!ctx.ok) return ctx;
  const { parentSong, rootId, userApiKey, hasApiKey } = ctx.data;

  let prompt = (parentSong.prompt || "").trim();
  if (input.prompt !== undefined && input.prompt !== null) {
    const { value, error } = sanitizeText(input.prompt, "prompt");
    if (error) return Err.validation(error);
    prompt = value || prompt;
  }

  let style: string | undefined = (parentSong.tags || "").trim() || undefined;
  if (input.style !== undefined && input.style !== null) {
    const { value, error } = sanitizeText(input.style, "style", 500);
    if (error) return Err.validation(error);
    style = value || undefined;
  }

  let title: string | null = parentSong.title ? `${parentSong.title} (extended)` : null;
  if (input.title !== undefined && input.title !== null) {
    const { value, error } = sanitizeText(input.title, "title");
    if (error) return Err.validation(error);
    title = value || title;
  }

  const continueAt = typeof input.continueAt === "number" ? input.continueAt : undefined;

  if (hasApiKey && !parentSong.sunoAudioId) {
    return Err.validation("Cannot extend a song without a Suno audio ID.");
  }

  const outcome = await executeGeneration({
    userId,
    action: "extend",
    songParams: {
      title: title || null,
      prompt,
      tags: style || null,
      isInstrumental: parentSong.isInstrumental,
      parentSongId: rootId,
    },
    hasApiKey,
    mockFallback: mockSongs[0],
    description: `Music extension: ${title || "Untitled"}`,
    apiCall: () => extendMusic(
      {
        audioId: parentSong.sunoAudioId!,
        defaultParamFlag: !!(prompt || style || title || continueAt),
        prompt: prompt || undefined,
        style,
        title: title || undefined,
        continueAt,
      },
      userApiKey,
    ),
  });

  return success(outcome);
}
