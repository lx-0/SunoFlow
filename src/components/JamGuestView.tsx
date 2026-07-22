"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Music, PartyPopper } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CoverArtImage } from "./CoverArtImage";
import { fetchJamState } from "@/lib/jam-client";
import type { JamSessionState } from "@/lib/jam/state";

const POLL_INTERVAL_MS = 5000;

/**
 * Guest surface for a jam session — token-authed, no account, mobile-first.
 * Renders standalone (no AppShell). The prompt composer (T02) and nickname
 * (T03) extend this view.
 */
export function JamGuestView({ token }: { token: string }) {
  const [state, setState] = useState<JamSessionState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pollError, setPollError] = useState(false);

  const refresh = useCallback(async () => {
    const result = await fetchJamState(token);
    if (result.ok) {
      setState(result.state);
      setNotFound(false);
      setPollError(false);
      return;
    }
    if (result.status === 404) {
      setNotFound(true);
    } else {
      setPollError(true);
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  if (notFound) {
    return (
      <main className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center gap-3 p-6 text-center">
        <Icon icon={PartyPopper} className="w-10 h-10 text-gray-600" aria-hidden="true" />
        <h1 className="text-lg font-semibold text-white">This party doesn&apos;t exist</h1>
        <p className="text-sm text-gray-400">
          The link may be wrong, or the session was removed.
        </p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="min-h-dvh bg-gray-950 flex items-center justify-center gap-2 text-gray-400 text-sm">
        <Icon icon={Loader2} className="w-4 h-4 animate-spin" aria-hidden="true" />
        Joining the party…
      </main>
    );
  }

  const { session, nowPlaying, entries } = state;
  const isClosed = session.status === "closed";
  const budgetLeft = session.budgetTotal - session.budgetUsed;

  return (
    <main className="min-h-dvh bg-gray-950 text-white">
      <div className="max-w-lg mx-auto px-4 py-5 space-y-4 pb-28">
        {/* Header */}
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Icon icon={PartyPopper} className="w-5 h-5 text-violet-400 flex-shrink-0" aria-hidden="true" />
              <span className="truncate">{session.name}</span>
            </h1>
            <p className="text-xs text-gray-400">
              {session.hostName ? `Hosted by ${session.hostName}` : "Live jam session"}
            </p>
          </div>
          {!isClosed && (
            <div className="flex-shrink-0 text-right">
              <div className="text-xl font-bold text-violet-400 tabular-nums">{budgetLeft}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">songs left</div>
            </div>
          )}
        </header>

        {isClosed && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center text-sm text-gray-300">
            This party has ended — thanks for playing.
          </div>
        )}

        {pollError && (
          <p className="text-xs text-red-400" role="alert">
            Live updates interrupted — retrying…
          </p>
        )}

        {/* Now playing */}
        {nowPlaying && (
          <section
            aria-label="Now playing"
            className="bg-gray-900 border border-violet-500/30 rounded-xl p-3 flex items-center gap-3"
          >
            <div className="relative flex-shrink-0 w-12 h-12 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center">
              {nowPlaying.song.imageUrl ? (
                <CoverArtImage
                  src={nowPlaying.song.imageUrl}
                  alt={nowPlaying.song.title ?? "Song"}
                  fill
                  className="object-cover"
                  sizes="48px"
                  songId={nowPlaying.song.id}
                  fallbackSrc="/icons/icon-512.png"
                />
              ) : (
                <Icon icon={Music} className="w-5 h-5 text-gray-500" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-400">
                Now playing
              </p>
              <p className="text-sm font-medium truncate">
                {nowPlaying.song.title ?? "Untitled"}
              </p>
            </div>
          </section>
        )}

        {/* Queue */}
        <section aria-label="Requests" className="space-y-2">
          <h2 className="text-sm font-semibold text-gray-200">
            Requests ({entries.length})
          </h2>
          {entries.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-sm text-gray-400">
              No requests yet — be the first to pick the music.
            </div>
          ) : (
            <ul className="space-y-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center">
                    {entry.song?.imageUrl ? (
                      <CoverArtImage
                        src={entry.song.imageUrl}
                        alt={entry.song.title ?? "Song"}
                        fill
                        className="object-cover"
                        sizes="40px"
                        songId={entry.song.id}
                        fallbackSrc="/icons/icon-512.png"
                      />
                    ) : entry.status === "pending" ? (
                      <Icon icon={Loader2} className="w-4 h-4 text-violet-400 animate-spin" aria-hidden="true" />
                    ) : (
                      <Icon icon={Music} className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.song?.title ?? entry.promptText}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {entry.guestName ?? "Guest"}
                      {entry.status === "pending" && " · generating…"}
                      {entry.status === "failed" && " · couldn’t be generated"}
                    </p>
                  </div>
                  {entry.status === "ready" && (
                    <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-violet-400/10 text-violet-400">
                      Ready
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
