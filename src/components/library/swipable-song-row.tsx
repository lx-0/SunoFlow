import { useEffect, useRef, useState } from "react";
import type { SongListItemProps } from "@/components/SongListItem";
import { SongListItem } from "@/components/SongListItem";
import { Download, Share, Trash2 } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

type SongRowProps = SongListItemProps;

export function SwipableSongRow(props: SongRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const isOpen = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const startBase = useRef(0);
  const directionLocked = useRef<"horizontal" | "vertical" | null>(null);

  const onTogglePlayRef = useRef(props.onTogglePlay);
  const initialSongRef = useRef(props.initialSong);
  const onSingleArchiveRef = useRef(props.onSingleArchive);
  const onDownloadRef = useRef(props.onDownload);
  useEffect(() => {
    onTogglePlayRef.current = props.onTogglePlay;
  }, [props.onTogglePlay]);
  useEffect(() => {
    initialSongRef.current = props.initialSong;
  }, [props.initialSong]);
  useEffect(() => {
    onSingleArchiveRef.current = props.onSingleArchive;
  }, [props.onSingleArchive]);
  useEffect(() => {
    onDownloadRef.current = props.onDownload;
  }, [props.onDownload]);

  const REVEAL_WIDTH = 156;
  const SNAP_THRESHOLD = 60;

  function vibrate(ms = 10) {
    try {
      navigator.vibrate?.(ms);
    } catch {
      // Vibration API not available
    }
  }

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const el = containerRef.current;
    if (!el) return;

    function handleTouchStart(e: TouchEvent) {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      startBase.current = isOpen.current ? -REVEAL_WIDTH : 0;
      directionLocked.current = null;
      setIsDragging(true);
    }

    function handleTouchMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - startX.current;
      const dy = e.touches[0].clientY - startY.current;

      if (directionLocked.current === null) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
          directionLocked.current =
            Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical";
        }
        return;
      }

      if (directionLocked.current !== "horizontal") return;

      const newOffset = Math.max(
        -REVEAL_WIDTH,
        Math.min(REVEAL_WIDTH, startBase.current + dx)
      );
      setOffset(newOffset);
    }

    function handleTouchEnd() {
      setIsDragging(false);
      directionLocked.current = null;

      setOffset((currentOffset) => {
        const dx = currentOffset - startBase.current;
        const wasOpen = isOpen.current;

        if (!wasOpen) {
          if (dx >= SNAP_THRESHOLD) {
            onTogglePlayRef.current(initialSongRef.current);
            vibrate(15);
            return 0;
          } else if (dx <= -SNAP_THRESHOLD) {
            vibrate(10);
            isOpen.current = true;
            return -REVEAL_WIDTH;
          }
          return 0;
        }

        if (dx >= SNAP_THRESHOLD) {
          isOpen.current = false;
          return 0;
        }
        return -REVEAL_WIDTH;
      });
    }

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  const song = props.initialSong;
  const hasAudio = Boolean(song.audioUrl) && song.generationStatus !== "pending";

  function handleQuickShare() {
    setOffset(0);
    isOpen.current = false;
    vibrate(10);
    const shareUrl = `${window.location.origin}/library/${song.id}`;
    if (navigator.share) {
      navigator.share({ title: song.title ?? "Song", url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareUrl).catch(() => {});
    }
  }

  function handleQuickDownload() {
    setOffset(0);
    isOpen.current = false;
    vibrate(10);
    onDownloadRef.current(song);
  }

  function handleQuickDelete() {
    setOffset(0);
    isOpen.current = false;
    vibrate(15);
    onSingleArchiveRef.current(song);
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl">
      <div
        className="absolute inset-y-0 right-0 flex items-stretch"
        style={{ width: REVEAL_WIDTH }}
        aria-hidden="true"
      >
        <button
          onClick={handleQuickShare}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-500 text-white active:bg-blue-600 transition-colors"
          aria-label="Share song"
          tabIndex={-1}
        >
          <Icon icon={Share} className="w-5 h-5" />
          <span className="text-[10px] font-medium">Share</span>
        </button>
        <button
          onClick={handleQuickDownload}
          disabled={!hasAudio}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-violet-600 text-white active:bg-violet-700 disabled:opacity-40 transition-colors"
          aria-label="Download song"
          tabIndex={-1}
        >
          <Icon icon={Download} className="w-5 h-5" />
          <span className="text-[10px] font-medium">Save</span>
        </button>
        <button
          onClick={handleQuickDelete}
          className="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 text-white active:bg-red-600 transition-colors"
          aria-label="Archive song"
          tabIndex={-1}
        >
          <Icon icon={Trash2} className="w-5 h-5" />
          <span className="text-[10px] font-medium">Delete</span>
        </button>
      </div>

      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging
            ? "none"
            : "transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
        onClick={
          offset !== 0
            ? (e) => {
                e.stopPropagation();
                setOffset(0);
                isOpen.current = false;
              }
            : undefined
        }
      >
        <SongListItem {...props} />
      </div>
    </div>
  );
}
