import { asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet, apiPost, apiDelete } from "./client";

// Personas talk to the existing web endpoint (authDataRoute → resolveUser accepts
// the bearer sk- key). GET /api/personas returns { personas: PersonaEntry[] }
// where each entry has { id, personaId, name, description, style, ... } (see
// web src/lib/personas/index.ts PersonaEntry). We map defensively because the
// JSON crosses a serialization boundary (Date → string, nullable fields).

export interface Persona {
  /** DB row id (used to prefill the Generate screen). */
  id: string;
  /** Suno-side persona id. */
  personaId: string | null;
  name: string;
  description: string | null;
  style: string | null;
}

function mapApiPersona(raw: unknown): Persona | null {
  const r = asRecord(raw);
  const id = r ? asString(r.id) : null;
  if (!r || !id) return null;
  return {
    id,
    personaId: asString(r.personaId),
    name: asString(r.name) ?? "Untitled persona",
    description: asString(r.description),
    style: asString(r.style),
  };
}

/** List the user's saved personas (newest first, as returned by the API). */
export async function fetchPersonas(): Promise<Persona[]> {
  const res = await apiGet<unknown>(`/api/personas`);
  return unwrapList(res, "personas", mapApiPersona);
}

/** Delete a saved persona by its DB row id. */
export async function deletePersona(id: string): Promise<void> {
  await apiDelete(`/api/personas/${id}`);
}

/**
 * Clone a voice persona from a song. `taskId` is the song's Suno generation task
 * (sunoJobId); the optional vocal range trims which segment the voice is learned
 * from (whole song if omitted). POST /api/personas { taskId, name, ... }.
 */
export async function createPersonaFromSong(input: {
  taskId: string;
  name: string;
  songId?: string;
  description?: string;
  style?: string;
  vocalStart?: number;
  vocalEnd?: number;
}): Promise<void> {
  await apiPost("/api/personas", {
    taskId: input.taskId,
    name: input.name.trim(),
    ...(input.songId ? { songId: input.songId } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.style ? { style: input.style } : {}),
    ...(input.vocalStart !== undefined ? { vocalStart: input.vocalStart } : {}),
    ...(input.vocalEnd !== undefined ? { vocalEnd: input.vocalEnd } : {}),
  });
}
