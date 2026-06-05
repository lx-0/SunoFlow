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

interface PersonasResponse {
  personas: unknown[];
}

function mapApiPersona(raw: unknown): Persona | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const name = typeof r.name === "string" ? r.name : "Untitled persona";
  return {
    id: r.id,
    personaId: typeof r.personaId === "string" ? r.personaId : null,
    name,
    description: typeof r.description === "string" ? r.description : null,
    style: typeof r.style === "string" ? r.style : null,
  };
}

/** List the user's saved personas (newest first, as returned by the API). */
export async function fetchPersonas(): Promise<Persona[]> {
  const res = await apiGet<PersonasResponse>(`/api/personas`);
  return (Array.isArray(res?.personas) ? res.personas : [])
    .map(mapApiPersona)
    .filter((p): p is Persona => p !== null);
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
