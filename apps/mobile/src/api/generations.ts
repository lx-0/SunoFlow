import { asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet } from "./client";
import { mapApiSong } from "./songs";
import type { Song } from "@/types";

// Read-only view of the user's generation jobs. The web backend
// (`GET /api/generations` → queryGenerations) returns `{ songs, nextCursor, total }`
// where each row is a Song with a `generationStatus` and (once finished) an
// `audioUrl`. Shapes are mapped DEFENSIVELY at the boundary — missing/odd fields
// degrade gracefully, never throw, since this is unverified from a headless env.

export interface Generation {
  id: string;
  /** Raw backend status (e.g. pending/processing/ready/failed); never null. */
  status: string;
  /** Title if present, else the prompt, else null. */
  title: string | null;
  prompt: string | null;
  createdAt: string | null;
  /** Playable Song if the job produced audio, else null (row is non-interactive). */
  song: Song | null;
}

/** Defensive map of one raw generation row → narrowed Generation. */
function mapGeneration(raw: unknown): Generation | null {
  const g = asRecord(raw);
  const id = g ? asString(g.id) : null;
  if (!g || !id) return null;
  return {
    id,
    status: asString(g.generationStatus) ?? "unknown",
    title: asString(g.title),
    prompt: asString(g.prompt),
    createdAt: asString(g.createdAt),
    song: mapApiSong(raw),
  };
}

/** Fetch the first page of generation jobs (newest first). */
export async function fetchGenerations(): Promise<Generation[]> {
  const res = await apiGet<unknown>("/api/generations");
  return unwrapList(res, "songs", mapGeneration);
}
