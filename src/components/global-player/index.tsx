"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, Music, Smile, Volume2, VolumeX } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CoverArtImage } from "../CoverArtImage";
import { useQueue } from "../QueueContext";
import { UpNextPanel } from "../UpNextPanel";
import { LyricsPanel } from "../LyricsPanel";
import { EqualizerPanel } from "../EqualizerPanel";
import { PlayerWaveform } from "../PlayerWaveform";
import { EmojiReactionPicker } from "../EmojiReactionPicker";
import { ReactionTimeline } from "../ReactionTimeline";
import { ExpandedPlayer } from "../ExpandedPlayer";
import {
  Drawer,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
} from "../ui/drawer";
import { formatDuration as formatTime } from "@/lib/time-format";
import { usePathname, useRouter } from "next/navigation";
import { usePlayerSongData } from "./usePlayerSongData";
import { useTimedPopups } from "./useTimedPopups";
import { FloatingPopups } from "./FloatingPopups";
import { PlayerControls } from "./PlayerControls";
import { PlayerOptionsMenu } from "./PlayerOptionsMenu";

export function GlobalPlayer({
  sidebarCollapsed,
}: {
  sidebarCollapsed?: boolean;
}) {
  const {
    queue,
    currentIndex,
    isPlaying,
    isBuffering,
    currentTime,
    duration,
    shuffle,
    repeat,
    volume,
    muted,
    playlistSource,
    radioState,
    togglePlay,
    skipNext,
    skipPrev,
    seek,
    toggleShuffle,
    cycleRepeat,
    clearQueue,
    setVolume,
    toggleMute,
    shuffleVersions,
    toggleShuffleVersions,
    activeVersion,
  } = useQueue();

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  const {
    session,
    isFavorite,
    reactions,
    timedComments,
    handleReact,
    handleToggleFavorite,
  } = usePlayerSongData(currentSong?.id, currentTime, duration);

  const { activePopups, activeCommentPopups } = useTimedPopups(
    isPlaying,
    duration,
    currentTime,
    reactions,
    timedComments,
    currentSong?.id,
  );

  const [showUpNext, setShowUpNext] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [showEQ, setShowEQ] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const handleCoverClick = useCallback(() => {
    if (!currentSong) return;
    const isDesktop =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    if (isDesktop) {
      router.push(`/library/${currentSong.id}`);
    } else {
      setIsDrawerOpen(true);
    }
  }, [currentSong, router]);

  useEffect(() => {
    if (!isPlaying) setShowReactions(false);
  }, [isPlaying]);

  useEffect(() => {
    if (pathname?.includes("/library/")) {
      setShowLyrics(false);
    }
  }, [pathname]);

  useEffect(() => {
    if (!currentSong?.lyrics) {
      setShowLyrics(false);
    }
  }, [currentSong?.id, currentSong?.lyrics]);

  if (!currentSong) return null;

  const queueRemaining = queue.length - (currentIndex + 1);

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <div
        role="region"
        aria-label="Audio player"
        className={`fixed bottom-16 left-0 right-0 z-20 px-2 md:bottom-0 transition-all duration-200 ${sidebarCollapsed ? "md:left-16" : "md:left-56"}`}
      >
        {showLyrics && currentSong?.lyrics && (
          <div className="max-w-3xl mx-auto md:mx-0 mb-1">
            <LyricsPanel
              lyrics={currentSong.lyrics}
              songTitle={currentSong.title}
              onClose={() => setShowLyrics(false)}
            />
          </div>
        )}

        {showUpNext && (
          <div className="max-w-3xl mx-auto md:mx-0 mb-1">
            <UpNextPanel onClose={() => setShowUpNext(false)} />
          </div>
        )}

        {showEQ && (
          <div className="max-w-3xl mx-auto md:mx-0 mb-1">
            <EqualizerPanel onClose={() => setShowEQ(false)} />
          </div>
        )}

        <div className="relative max-w-3xl mx-auto md:mx-0">
          <FloatingPopups
            emojiPopups={activePopups}
            commentPopups={activeCommentPopups}
          />

          <div className="bg-surface rounded-2xl md:rounded-none md:rounded-t-2xl shadow-2xl border border-border">
            <div className="relative h-12 px-2 pt-1 pb-0.5 bg-surface overflow-hidden rounded-t-2xl md:rounded-none md:rounded-t-2xl">
              <PlayerWaveform
                songId={currentSong.id}
                currentTime={currentTime}
                duration={duration}
                isBuffering={isBuffering}
                onSeek={seek}
                reactionTimestamps={reactions.map((r) => r.timestamp)}
                commentTimestamps={timedComments.map((c) => c.timestamp)}
              />
              {reactions.length > 0 && duration > 0 && (
                <div className="absolute inset-x-2 top-0 bottom-0 pointer-events-none">
                  <div className="pointer-events-auto">
                    <ReactionTimeline
                      reactions={reactions}
                      duration={duration}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 sm:gap-2 px-2 sm:px-3 py-3">
              <button
                key={currentSong.id}
                onClick={handleCoverClick}
                className="relative flex-shrink-0 w-12 h-12 md:w-10 md:h-10 rounded-lg bg-surface-raised overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-violet-500/50 transition-all"
                aria-label="Open song details"
                title="Open song details"
              >
                {currentSong.imageUrl ? (
                  <CoverArtImage
                    src={currentSong.imageUrl}
                    alt={currentSong.title ?? "Song"}
                    fill
                    className="object-cover"
                    sizes="48px"
                    songId={currentSong.id}
                    fallbackSrc="/icons/icon-512.png"
                  />
                ) : (
                  <Icon
                    icon={Music}
                    className="w-5 h-5 text-muted"
                    aria-hidden="true"
                  />
                )}
              </button>

              <button
                type="button"
                className="flex-1 min-w-0 text-left"
                onClick={() => setIsDrawerOpen(true)}
                aria-label="Expand player"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-sm font-medium text-primary truncate hover:text-violet-400 transition-colors cursor-pointer"
                    aria-live="polite"
                  >
                    {currentSong.title ?? "Untitled"}
                  </span>
                  {activeVersion &&
                    activeVersion.id !== currentSong.id && (
                      <span className="flex-shrink-0 text-[10px] font-medium text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">
                        Alt version
                      </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(duration)}</span>
                  {radioState ? (
                    <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-purple-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
                      Radio{radioState.mood ? `: ${radioState.mood}` : ""}
                    </span>
                  ) : playlistSource ? (
                    <span
                      className="ml-auto hidden sm:inline truncate max-w-[120px]"
                      title={`Playing from: ${playlistSource}`}
                    >
                      Playing from: {playlistSource}
                    </span>
                  ) : (
                    <span className="ml-auto hidden sm:inline">
                      {currentIndex + 1} of {queue.length}
                    </span>
                  )}
                </div>
              </button>

              {isPlaying && !!session?.user && (
                <div className="relative flex-shrink-0">
                  <button
                    onClick={() => setShowReactions((v) => !v)}
                    aria-label={
                      showReactions ? "Hide reactions" : "React with emoji"
                    }
                    aria-expanded={showReactions}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                      showReactions
                        ? "text-violet-400 bg-surface-hover"
                        : "text-secondary hover:text-primary"
                    }`}
                  >
                    <Icon icon={Smile} className="w-5 h-5" />
                  </button>
                  {showReactions && (
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
                      <EmojiReactionPicker
                        isPlaying={isPlaying}
                        isAuthenticated={!!session?.user}
                        onReact={handleReact}
                        reactionEmojis={reactions.map((r) => r.emoji)}
                      />
                    </div>
                  )}
                </div>
              )}

              {session?.user && (
                <button
                  onClick={handleToggleFavorite}
                  aria-label={
                    isFavorite
                      ? "Remove from favorites"
                      : "Add to favorites"
                  }
                  className={`flex-shrink-0 w-8 h-8 flex items-center justify-center transition-colors ${
                    isFavorite
                      ? "text-pink-500"
                      : "text-secondary hover:text-pink-400"
                  }`}
                >
                  {isFavorite ? (
                    <Icon
                      icon={Heart}
                      className="w-5 h-5"
                      fill="currentColor"
                    />
                  ) : (
                    <Icon icon={Heart} className="w-5 h-5" />
                  )}
                </button>
              )}

              <div className="hidden sm:flex items-center gap-1 mr-1">
                <button
                  onClick={toggleMute}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="w-8 h-8 flex items-center justify-center text-secondary hover:text-primary transition-colors"
                >
                  {muted || volume === 0 ? (
                    <Icon icon={VolumeX} className="w-4 h-4" />
                  ) : (
                    <Icon icon={Volume2} className="w-4 h-4" />
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : Math.round(volume * 100)}
                  onChange={(e) => setVolume(Number(e.target.value) / 100)}
                  aria-label="Volume"
                  className="w-16 h-1 accent-violet-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <PlayerControls
                  isPlaying={isPlaying}
                  isBuffering={isBuffering}
                  shuffle={shuffle}
                  shuffleVersions={shuffleVersions}
                  repeat={repeat}
                  showLyrics={showLyrics}
                  showEQ={showEQ}
                  showUpNext={showUpNext}
                  hasLyrics={!!currentSong?.lyrics}
                  queueRemaining={queueRemaining}
                  togglePlay={togglePlay}
                  skipNext={skipNext}
                  skipPrev={skipPrev}
                  toggleShuffle={toggleShuffle}
                  toggleShuffleVersions={toggleShuffleVersions}
                  cycleRepeat={cycleRepeat}
                  clearQueue={clearQueue}
                  onToggleLyrics={() => setShowLyrics((v) => !v)}
                  onToggleEQ={() => setShowEQ((v) => !v)}
                  onToggleUpNext={() => setShowUpNext((v) => !v)}
                />

                <PlayerOptionsMenu
                  isOpen={showOptionsMenu}
                  onToggle={() => setShowOptionsMenu((v) => !v)}
                  onClose={() => setShowOptionsMenu(false)}
                  shuffle={shuffle}
                  shuffleVersions={shuffleVersions}
                  repeat={repeat}
                  showLyrics={showLyrics}
                  showEQ={showEQ}
                  showUpNext={showUpNext}
                  hasLyrics={!!currentSong?.lyrics}
                  queueRemaining={queueRemaining}
                  songId={currentSong.id}
                  toggleShuffle={toggleShuffle}
                  toggleShuffleVersions={toggleShuffleVersions}
                  cycleRepeat={cycleRepeat}
                  onToggleLyrics={() => setShowLyrics((v) => !v)}
                  onToggleEQ={() => setShowEQ((v) => !v)}
                  onToggleUpNext={() => setShowUpNext((v) => !v)}
                />
              </div>
            </div>
          </div>
        </div>

        <DrawerContent className="h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-[480px] md:mx-auto md:rounded-2xl">
          <DrawerHandle className="md:hidden" />
          <DrawerTitle className="sr-only">Now Playing</DrawerTitle>
          <ExpandedPlayer
            isFavorite={isFavorite}
            onToggleFavorite={handleToggleFavorite}
            reactions={reactions}
            onReact={handleReact}
            isAuthenticated={!!session?.user}
            onClose={() => setIsDrawerOpen(false)}
          />
        </DrawerContent>
      </div>
    </Drawer>
  );
}
