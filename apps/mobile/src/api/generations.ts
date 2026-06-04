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

interface GenerationsResponse {
  songs: unknown[];
  nextCursor: string | null;
  total: number;
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Defensive map of one raw generation row → narrowed Generation. */
function mapGeneration(raw: unknown): Generation | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const id = str(g.id);
  if (!id) return null;
  return {
    id,
    status: str(g.generationStatus) ?? "unknown",
    title: str(g.title),
    prompt: str(g.prompt),
    createdAt: str(g.createdAt),
    song: mapApiSong(raw),
  };
}

/** Fetch the first page of generation jobs (newest first). */
export async function fetchGenerations(): Promise<Generation[]> {
  const res = await apiGet<GenerationsResponse>("/api/generations");
  const rows = Array.isArray(res?.songs) ? res.songs : [];
  return rows.map(mapGeneration).filter((g): g is Generation => g !== null);
}
