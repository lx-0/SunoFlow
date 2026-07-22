"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Music, PartyPopper, QrCode } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CoverArtImage } from "./CoverArtImage";
import { JamQrOverlay } from "./JamQrOverlay";
import { fetchJamState, type JamSessionDetail } from "@/lib/jam-client";
import type { JamSessionState } from "@/lib/jam/state";

const POLL_INTERVAL_MS = 5000;

/**
 * Host console for a jam session: budget countdown, the guest join URL, and
 * the live queue. Polls the SAME tokened endpoint the guests' phones use —
 * dogfooding the public surface (incl. the middleware pass-through).
 * Controls (QR overlay, veto, close) land in S02-T02/T04.
 */
export function PartyHostView({ session }: { session: JamSessionDetail }) {
  const [state, setState] = useState<JamSessionState | null>(null);
  const [pollError, setPollError] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const refresh = useCallback(async () => {
    const result = await fetchJamState(session.shareToken);
    if (result.ok) {
      setState(result.state);
      setPollError(false);
    } else {
      setPollError(true);
    }
  }, [session.shareToken]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  // Origin is applied after mount — SSR and the first client render must
  // match (path only), or React #418 hydration errors fire.
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const meta = state?.session;
  const budgetLeft = meta ? meta.budgetTotal - meta.budgetUsed : null;
  const joinUrl = `${origin}/jam/${session.shareToken}`;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <Icon icon={PartyPopper} className="w-5 h-5 text-violet-400" aria-hidden="true" />
            <span className="truncate">{meta?.name ?? session.name}</span>
          </h1>
          <p className="text-sm text-secondary">
            {meta?.status === "closed" ? "Session ended" : "Live jam session"}
          </p>
        </div>
        {budgetLeft !== null && (
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl font-bold text-violet-400 tabular-nums">{budgetLeft}</div>
            <div className="text-xs text-secondary">songs left</div>
          </div>
        )}
      </div>

      {/* Guest join URL + QR */}
      <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-primary">Guests join at</h2>
          <button
            onClick={() => setShowQr(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors min-h-[44px]"
          >
            <Icon icon={QrCode} className="w-4 h-4" />
            Show QR
          </button>
        </div>
        <p className="text-sm text-violet-400 break-all select-all" data-testid="jam-join-url">
          {joinUrl}
        </p>
      </div>

      {showQr && (
        <JamQrOverlay
          joinUrl={joinUrl}
          sessionName={meta?.name ?? session.name}
          onClose={() => setShowQr(false)}
        />
      )}

      {pollError && (
        <p className="text-sm text-red-400" role="alert">
          Live updates interrupted — retrying…
        </p>
      )}

      {/* Live queue */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-primary">
          Requests{state ? ` (${state.entries.length})` : ""}
        </h2>
        {!state ? (
          <div className="flex items-center gap-2 text-secondary text-sm py-6 justify-center">
            <Icon icon={Loader2} className="w-4 h-4 animate-spin" aria-hidden="true" />
            Loading session…
          </div>
        ) : state.entries.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-6 text-center text-sm text-secondary">
            No requests yet — put the join link on a screen and let the party pick the music.
          </div>
        ) : (
          <ul className="space-y-2">
            {state.entries.map((entry) => (
              <li
                key={entry.id}
                className="bg-surface border border-border rounded-xl p-3 flex items-center gap-3"
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-surface-raised overflow-hidden flex items-center justify-center">
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
                    <Icon
                      icon={Loader2}
                      className="w-4 h-4 text-violet-400 animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Icon icon={Music} className="w-4 h-4 text-muted" aria-hidden="true" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-primary truncate">
                    {entry.song?.title ?? entry.promptText}
                  </p>
                  <p className="text-xs text-secondary truncate">
                    {entry.guestName ?? "Guest"}
                    {entry.status === "pending" && " · generating…"}
                    {entry.status === "failed" && " · failed"}
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
      </div>
    </div>
  );
}
