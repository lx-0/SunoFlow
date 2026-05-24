import { executeTransform, respondToTransform } from "@/lib/generation";
import { requireOwnedSong } from "@/lib/songs/ownership";
import { validateSongTransformPrerequisites } from "@/lib/song-transform-guards";
import { resolveUserApiKey } from "@/lib/sunoapi";

interface OwnedTransformOptions {
  songId: string;
  userId: string;
  route: string;
  logLabel: string;
  format: string;
  mockTaskId: string;
  notReadyMessage: string;
  missingIdentifiersMessage: string;
  fallbackErrorMessage: string;
  apiCall: (
    identifiers: { taskId: string; audioId: string },
    userApiKey?: string,
  ) => Promise<{ taskId: string }>;
}

export async function runOwnedSongTransform(options: OwnedTransformOptions): Promise<Response> {
  const { data: song, error } = await requireOwnedSong(options.songId, options.userId);
  if (error) return error;

  const userApiKey = (await resolveUserApiKey(options.userId)) ?? undefined;
  const hasApiKey = !!(userApiKey ?? process.env.SUNOAPI_KEY);
  const validationError = validateSongTransformPrerequisites(song, {
    requireIdentifiers: hasApiKey,
    notReadyMessage: options.notReadyMessage,
    missingIdentifiersMessage: options.missingIdentifiersMessage,
  });
  if (validationError) return validationError;

  const outcome = await executeTransform({
    userId: options.userId,
    action: "generate",
    apiCall: () => options.apiCall(
      { taskId: song.sunoJobId!, audioId: song.sunoAudioId! },
      userApiKey,
    ),
    hasApiKey,
    mockTaskId: options.mockTaskId,
    fallbackErrorMessage: options.fallbackErrorMessage,
  });

  return respondToTransform(
    outcome,
    { label: options.logLabel, userId: options.userId, route: options.route },
    { songId: options.songId, format: options.format },
  );
}
