"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Music, PartyPopper, Send } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CoverArtImage } from "./CoverArtImage";
import { fetchJamState, pushJamPromptApi } from "@/lib/jam-client";
import type { JamSessionState } from "@/lib/jam/state";

const POLL_INTERVAL_MS = 5000;
const GUEST_KEY_STORAGE = "sunoflow-jam-guest-key";
const GUEST_NAME_STORAGE = "sunoflow-jam-guest-name";

const VIBE_CHIPS = [
  "Italo disco",
  "90s eurodance",
  "Punk rock",
  "Lo-fi chill",
  "Schlager",
  "Techno banger",
];

function ensureGuestKey(): string {
  try {
    const existing = localStorage.getItem(GUEST_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing;
    const key = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY_STORAGE, key);
    return key;
  } catch {
    // Private-mode fallback: stable for this page load only.
    return `guest-${Math.random().toString(36).slice(2, 12)}`;
  }
}

/**
 * Guest surface for a jam session — token-authed, no account, mobile-first.
 * Renders standalone (no AppShell). The prompt composer (T02) and nickname
 * (T03) extend this view.
 */
export function JamGuestView({ token }: { token: string }) {
  const [state, setState] = useState<JamSessionState | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [guestKey, setGuestKey] = useState("");
  const [guestName, setGuestName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    setGuestKey(ensureGuestKey());
    try {
      setGuestName(localStorage.getItem(GUEST_NAME_STORAGE) ?? "");
    } catch {
      // private mode — name just won't persist across reloads
    }
  }, []);

  function handleNameChange(value: string) {
    setGuestName(value);
    try {
      localStorage.setItem(GUEST_NAME_STORAGE, value.trim());
    } catch {
      // private mode — non-fatal
    }
  }

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

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = prompt.trim();
    if (!text || sending || !guestKey) return;

    setSending(true);
    setSendError(null);
    try {
      const result = await pushJamPromptApi(token, {
        promptText: text,
        guestKey,
        guestName: guestName.trim() || undefined,
      });
      if (!result.ok) {
        setSendError(result.error);
        return;
      }
      // The server's real entry card lands in the list immediately — no
      // fake optimistic row that could drift from a poll.
      setState((prev) =>
        prev
          ? {
              ...prev,
              session: {
                ...prev.session,
                budgetUsed: prev.session.budgetUsed + 1,
              },
              entries: [...prev.entries, result.entry],
            }
          : prev,
      );
      setPrompt("");
    } catch {
      setSendError("Couldn't send your request — check your connection");
    } finally {
      setSending(false);
    }
  }

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

      {/* Composer — fixed bottom */}
      {!isClosed && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 border-t border-gray-800 backdrop-blur">
          <div className="max-w-lg mx-auto px-4 py-3 space-y-2">
            {budgetLeft <= 0 ? (
              <p className="text-sm text-gray-400 text-center py-1">
                The party budget is used up — enjoy the queue!
              </p>
            ) : (
              <>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Your name (shows on your requests)"
                  maxLength={40}
                  aria-label="Your name"
                  className="w-full px-3 py-1.5 bg-transparent border border-gray-800 rounded-lg text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
                  {VIBE_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() =>
                        setPrompt((p) => (p.trim() ? `${p.trim()}, ${chip.toLowerCase()}` : chip))
                      }
                      className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs bg-gray-900 border border-gray-800 text-gray-300 hover:border-violet-500/50 transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
                <form onSubmit={handleSend} className="flex gap-2">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="What should the AI play next?"
                    maxLength={500}
                    aria-label="Song request"
                    className="flex-1 px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !prompt.trim()}
                    aria-label="Send request"
                    className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white transition-colors"
                  >
                    {sending ? (
                      <Icon icon={Loader2} className="w-5 h-5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Icon icon={Send} className="w-5 h-5" aria-hidden="true" />
                    )}
                  </button>
                </form>
                {sendError && (
                  <p className="text-xs text-red-400" role="alert" aria-live="polite">
                    {sendError}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
