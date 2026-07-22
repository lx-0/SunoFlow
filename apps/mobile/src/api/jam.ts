import { API_BASE_URL, apiDelete, apiGet, apiPost } from "./client";

// Host-side jam-session API (bearer-authed via the shared client). The guest
// state endpoint is tokened/public but the bearer header is harmless there.

export interface JamSessionSummary {
  id: string;
  playlistId: string;
  shareToken: string;
  status: string; // open | closed
  budgetTotal: number;
  budgetUsed: number;
  expiresAt: string | null;
  createdAt: string;
  closedAt: string | null;
  name: string;
}

export interface JamSongCard {
  id: string;
  title: string | null;
  imageUrl: string | null;
  duration: number | null;
  generationStatus: string;
}

export interface JamEntry {
  id: string;
  status: string; // pending | ready | failed (vetoed is filtered server-side)
  promptText: string;
  guestName: string | null;
  createdAt: string;
  song: JamSongCard | null;
}

export interface JamState {
  session: {
    id: string;
    name: string;
    hostName: string | null;
    status: string;
    budgetTotal: number;
    budgetUsed: number;
    expiresAt: string | null;
  };
  nowPlaying: { song: JamSongCard; position: number } | null;
  entries: JamEntry[];
}

export interface CreateJamSessionInput {
  name?: string;
  budgetTotal?: number;
  slug?: string;
  durationHours?: number;
}

export async function fetchJamSessions(): Promise<JamSessionSummary[]> {
  const res = await apiGet<{ sessions?: JamSessionSummary[] }>("/api/jam-sessions");
  return Array.isArray(res?.sessions) ? res.sessions : [];
}

export async function fetchJamSessionDetail(id: string): Promise<JamSessionSummary | null> {
  const res = await apiGet<{ session?: JamSessionSummary }>(`/api/jam-sessions/${id}`);
  return res?.session ?? null;
}

export async function createJamSession(
  input: CreateJamSessionInput,
): Promise<JamSessionSummary | null> {
  const res = await apiPost<{ session?: JamSessionSummary }>("/api/jam-sessions", input);
  return res?.session ?? null;
}

export async function closeJamSession(id: string): Promise<void> {
  await apiPost(`/api/jam-sessions/${id}/close`, {});
}

export async function vetoJamEntry(sessionId: string, entryId: string): Promise<void> {
  await apiDelete(`/api/jam-sessions/${sessionId}/entries/${entryId}`);
}

export async function fetchJamState(shareToken: string): Promise<JamState | null> {
  const res = await apiGet<JamState>(`/api/jam/${shareToken}`);
  return res ?? null;
}

/** The URL guests scan/open — always the public web origin. */
export function jamJoinUrl(shareToken: string): string {
  return `${API_BASE_URL}/jam/${shareToken}`;
}
