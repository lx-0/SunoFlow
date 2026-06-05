import { apiPost, apiPatch } from "./client";

// AI "studio" operations on a song. Each POST TRIGGERS a new async generation on
// the Suno backend (the result shows up as a new song/variation when ready) — the
// client fires and notifies; it does not wait for completion. Bodies mirror
// src/lib/songs/variations/schemas.ts.

/** Split the song into vocal + instrumental stems (creates new stem songs). */
export async function separateVocals(songId: string): Promise<void> {
  await apiPost(`/api/songs/${songId}/separate-vocals`, {});
}

/** Generate an instrumental version of the song. */
export async function addInstrumental(songId: string, opts?: { tags?: string; title?: string }): Promise<void> {
  await apiPost(`/api/songs/${songId}/add-instrumental`, {
    ...(opts?.tags ? { tags: opts.tags } : {}),
    ...(opts?.title ? { title: opts.title } : {}),
  });
}

/** Add vocals to an instrumental song. `prompt` (the lyrics/idea) is required. */
export async function addVocals(songId: string, prompt: string, opts?: { style?: string; title?: string }): Promise<void> {
  await apiPost(`/api/songs/${songId}/add-vocals`, {
    prompt: prompt.trim(),
    ...(opts?.style ? { style: opts.style } : {}),
    ...(opts?.title ? { title: opts.title } : {}),
  });
}

/** Regenerate (infill) a time section [startS, endS] with a new prompt. */
export async function replaceSection(
  songId: string,
  input: { prompt: string; infillStartS: number; infillEndS: number; tags?: string; negativeTags?: string; title?: string },
): Promise<void> {
  await apiPost(`/api/songs/${songId}/replace-section`, {
    prompt: input.prompt.trim(),
    infillStartS: input.infillStartS,
    infillEndS: input.infillEndS,
    ...(input.tags ? { tags: input.tags } : {}),
    ...(input.negativeTags ? { negativeTags: input.negativeTags } : {}),
    ...(input.title ? { title: input.title } : {}),
  });
}

/** Set the song's cover art by image URL (PATCH /cover-art { imageUrl }). */
export async function setCoverArt(songId: string, imageUrl: string): Promise<void> {
  await apiPatch(`/api/songs/${songId}/cover-art`, { imageUrl: imageUrl.trim() });
}
