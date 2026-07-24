"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CoverArtImage } from "./CoverArtImage";
import { useQueue } from "./QueueContext";
import type { JamSessionState } from "@/lib/jam/state";

/**
 * Fullscreen party display for a connected screen — the web counterpart of
 * the mobile JamPartyDisplay, sized for a laptop/beamer instead of a phone on
 * the table. Left: live now-playing (cover backdrop, big type, progress).
 * Right: the join QR. Goes browser-fullscreen on open (best-effort), keeps
 * the screen awake via the Wake Lock API, closes on Escape / fullscreen exit.
 *
 * Now-playing prefers the LOCAL queue (this tab is usually the host console
 * that plays the music) and falls back to the polled server state, so the
 * screen still works when the host plays from their phone instead.
 */
export function JamPartyDisplay({
  joinUrl,
  state,
  fallbackName,
  onClose,
}: {
  joinUrl: string;
  state: JamSessionState | null;
  fallbackName: string;
  onClose: () => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { queue, currentIndex, currentTime, duration } = useQueue();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // The parent passes an inline onClose and re-renders on every poll tick and
  // timeupdate. The fullscreen/keydown effects must run ONCE per mount — an
  // [onClose] dep would tear fullscreen down on the next tick (cleanup exits
  // fullscreen, the re-request has no user activation, fullscreenchange then
  // reads as "left fullscreen" and self-closes the view).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((qr) =>
        qr.toDataURL(joinUrl, { width: 640, margin: 2, errorCorrectionLevel: "M" }),
      )
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [joinUrl]);

  // Escape closes even when the fullscreen request was denied.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCloseRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Best-effort browser fullscreen; leaving fullscreen (Esc) closes the view.
  useEffect(() => {
    const el = rootRef.current;
    void el?.requestFullscreen?.().catch(() => {});
    function onFsChange() {
      if (!document.fullscreenElement) onCloseRef.current();
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, []);

  // Keep the party screen awake; re-acquire when the tab becomes visible
  // again (the browser silently releases the lock on visibility loss).
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let disposed = false;
    async function acquire() {
      try {
        const lock = await navigator.wakeLock?.request("screen");
        if (disposed) {
          void lock?.release().catch(() => {});
        } else {
          // Overlapping acquires (visibility flicker): release the earlier
          // sentinel before overwriting, or it leaks past unmount.
          if (sentinel && sentinel !== lock) void sentinel.release().catch(() => {});
          sentinel = lock ?? null;
        }
      } catch {
        // Unsupported browser or low battery — the display still works.
      }
    }
    void acquire();
    function onVisibility() {
      if (document.visibilityState === "visible") void acquire();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => {});
    };
  }, []);

  const meta = state?.session;
  const isClosed = meta?.status === "closed";
  const budgetLeft = meta ? meta.budgetTotal - meta.budgetUsed : null;

  const localSong = currentIndex >= 0 ? queue[currentIndex] : null;
  const now = localSong
    ? {
        id: localSong.id,
        title: localSong.title,
        imageUrl: localSong.imageUrl,
        progress: duration > 0 ? Math.min(currentTime / duration, 1) : null,
      }
    : state?.nowPlaying
      ? {
          id: state.nowPlaying.song.id,
          title: state.nowPlaying.song.title,
          imageUrl: state.nowPlaying.song.imageUrl,
          progress: null,
        }
      : null;
  const requestedBy = now
    ? (state?.entries.find((e) => e.song?.id === now.id)?.guestName ?? null)
    : null;

  const pendingCount = state?.entries.filter((e) => e.status === "pending").length ?? 0;
  const latest = state ? [...state.entries].slice(-3).reverse() : [];

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Party display"
      className="fixed inset-0 z-[90] bg-[#0b0709] overflow-hidden select-none"
    >
      {/* Cover art backdrop — heavily blurred and dimmed, remounts per song */}
      {now?.imageUrl && (
        <div key={now.id} className="absolute inset-0" aria-hidden="true">
          <CoverArtImage
            src={now.imageUrl}
            alt=""
            fill
            className="object-cover blur-3xl scale-110 opacity-25"
            sizes="100vw"
            songId={now.id}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0b0709]/80 via-transparent to-[#0b0709]/80" />
        </div>
      )}

      <button
        onClick={onClose}
        aria-label="Close party display"
        className="absolute top-[2vh] right-[2vh] z-10 w-11 h-11 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
      >
        <Icon icon={X} className="w-6 h-6" />
      </button>

      <div className="relative h-full flex items-center">
        {/* Left: session identity + now playing */}
        <main className="flex-1 min-w-0 flex flex-col justify-center gap-[2.5vh] pl-[6vw] pr-[3vw]">
          <div className="flex items-center gap-3">
            {!isClosed && (
              <span
                className="w-[1.4vh] h-[1.4vh] min-w-3 min-h-3 rounded-full bg-violet-400 animate-pulse"
                aria-hidden="true"
              />
            )}
            <span className="text-violet-400 font-extrabold tracking-[0.3em] text-[clamp(0.9rem,1.6vh,1.4rem)]">
              {isClosed ? "PARTY ENDED" : "LIVE"}
            </span>
          </div>

          <h1 className="text-white font-extrabold leading-[1.05] text-[clamp(2.2rem,7vh,5.5rem)] line-clamp-2">
            {meta?.name ?? fallbackName}
          </h1>

          {now ? (
            <div className="flex items-center gap-[3vw] mt-[1vh] min-w-0">
              <div className="relative flex-shrink-0 w-[min(30vh,22vw)] h-[min(30vh,22vw)] rounded-2xl overflow-hidden shadow-[0_0_120px_-20px_rgba(167,139,250,0.55)] bg-white/5">
                {now.imageUrl && (
                  <CoverArtImage
                    src={now.imageUrl}
                    alt={now.title ?? "Now playing cover"}
                    fill
                    className="object-cover"
                    sizes="30vh"
                    songId={now.id}
                    fallbackSrc="/icons/icon-512.png"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-gray-500 font-semibold tracking-[0.25em] text-[clamp(0.7rem,1.4vh,1.1rem)]">
                  NOW PLAYING
                </p>
                <p className="text-white font-bold leading-tight text-[clamp(1.5rem,4.2vh,3.2rem)] line-clamp-2 mt-[0.6vh]">
                  {now.title ?? "Untitled"}
                </p>
                {requestedBy && (
                  <p className="text-violet-300 text-[clamp(0.95rem,2vh,1.5rem)] mt-[0.8vh] truncate">
                    requested by {requestedBy}
                  </p>
                )}
                {now.progress !== null && (
                  <div
                    className="mt-[2vh] h-[0.8vh] min-h-1.5 rounded-full bg-white/10 overflow-hidden"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-violet-400"
                      style={{ width: `${Math.round(now.progress * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-[clamp(1.2rem,3vh,2.2rem)]">
              {isClosed
                ? "Thanks for jamming."
                : "Waiting for the first track — scan the code to request one."}
            </p>
          )}

          {!isClosed && latest.length > 0 && (
            <div className="mt-[2vh] space-y-[0.8vh] max-w-3xl">
              {pendingCount > 0 && (
                <p className="text-violet-400 font-semibold text-[clamp(0.9rem,1.8vh,1.3rem)]">
                  {pendingCount} brewing…
                </p>
              )}
              {latest.map((e) => (
                <p
                  key={e.id}
                  className="text-gray-400 text-[clamp(0.85rem,1.7vh,1.25rem)] truncate"
                >
                  <span className="text-gray-200">{e.guestName ?? "Guest"}</span>
                  {": "}
                  {e.song?.title ?? e.promptText}
                </p>
              ))}
            </div>
          )}
        </main>

        {/* Right: join QR + budget */}
        <aside className="flex-shrink-0 flex flex-col items-center gap-[2.2vh] pr-[6vw]">
          <div className="bg-white rounded-3xl p-[1.6vh] shadow-2xl">
            {qrDataUrl ? (
              // Data-URL QR — plain img on purpose (next/image adds nothing here).
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt={`QR code linking to ${joinUrl}`}
                className="w-[min(38vh,26vw)] h-[min(38vh,26vw)]"
              />
            ) : (
              <div
                className="w-[min(38vh,26vw)] h-[min(38vh,26vw)] animate-pulse bg-gray-200 rounded-xl"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="text-gray-300 font-medium text-[clamp(1rem,2.2vh,1.7rem)]">
            Scan to request a song
          </p>
          <p className="font-mono text-violet-300 text-[clamp(0.8rem,1.6vh,1.2rem)] break-all text-center max-w-[28vw]">
            {joinUrl.replace(/^https?:\/\//, "")}
          </p>
          {budgetLeft !== null && !isClosed && (
            <div className="flex items-center gap-3 mt-[1vh]">
              <span className="text-violet-400 font-extrabold leading-none text-[clamp(2.5rem,8vh,6rem)] tabular-nums">
                {budgetLeft}
              </span>
              <span className="text-gray-400 font-semibold text-[clamp(0.8rem,1.7vh,1.3rem)] leading-tight">
                songs
                <br />
                left
              </span>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
