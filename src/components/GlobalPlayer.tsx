"use client";

import { useCallback } from "react";
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  XMarkIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  HeartIcon,
} from "@heroicons/react/24/solid";
import {
  ArrowPathRoundedSquareIcon,
  ArrowsRightLeftIcon,
  MusicalNoteIcon,
  QueueListIcon,
  DocumentTextIcon,
  HeartIcon as HeartOutlineIcon,
  FaceSmileIcon,
  AdjustmentsHorizontalIcon,
  ChatBubbleLeftIcon,
  CubeIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { CoverArtImage } from "./CoverArtImage";
import { useQueue } from "./QueueContext";
import { UpNextPanel } from "./UpNextPanel";
import { LyricsPanel } from "./LyricsPanel";
import { EqualizerPanel } from "./EqualizerPanel";
import { PlayerWaveform } from "./PlayerWaveform";
import { EmojiReactionPicker } from "./EmojiReactionPicker";
import { ReactionTimeline } from "./ReactionTimeline";
import { useToast } from "./Toast";
import { useSession } from "next-auth/react";
import { ExpandedPlayer } from "./ExpandedPlayer";
import {
  Drawer,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
} from "./ui/drawer";
import { formatDuration as formatTime } from "@/lib/time-format";
import { usePlayerFavorite } from "./global-player/use-player-favorite";
import { usePlayerReactions } from "./global-player/use-player-reactions";
import { usePlayerCommentPopups } from "./global-player/use-player-comment-popups";
import { usePlayerPanels } from "./global-player/use-player-panels";

export function GlobalPlayer({ sidebarCollapsed }: { sidebarCollapsed?: boolean }) {
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

  const { data: session } = useSession();
  const { toast } = useToast();

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;

  const { isFavorite, handleToggleFavorite } = usePlayerFavorite(
    currentSong?.id,
    !!session?.user
  );

  const {
    reactions,
    activePopups,
    showReactions,
    setShowReactions,
    handleReact: rawHandleReact,
  } = usePlayerReactions(
    currentSong?.id,
    currentTime,
    duration,
    isPlaying,
    session
  );

  const handleReact = useCallback(
    async (emoji: string) => {
      const result = await rawHandleReact(emoji);
      if (result?.rateLimited) toast("Slow down! Too many reactions.", "info");
      else if (result?.error) toast("Couldn't save reaction. Try again.", "error");
    },
    [rawHandleReact, toast]
  );

  const { timedComments, activeCommentPopups } = usePlayerCommentPopups(
    currentSong?.id,
    currentTime,
    duration,
    isPlaying
  );

  const {
    showUpNext,
    setShowUpNext,
    showLyrics,
    setShowLyrics,
    showEQ,
    setShowEQ,
    showOptionsMenu,
    setShowOptionsMenu,
    isDrawerOpen,
    setIsDrawerOpen,
    optionsMenuRef,
    handleCoverClick,
  } = usePlayerPanels(currentSong);

  if (!currentSong) return null;

  return (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
    <div role="region" aria-label="Audio player" className={`fixed bottom-16 left-0 right-0 z-20 px-2 md:bottom-0 transition-all duration-200 ${sidebarCollapsed ? "md:left-16" : "md:left-56"}`}>
      {/* Lyrics panel */}
      {showLyrics && currentSong?.lyrics && (
        <div className="max-w-3xl mx-auto md:mx-0 mb-1">
          <LyricsPanel
            lyrics={currentSong.lyrics}
            songTitle={currentSong.title}
            onClose={() => setShowLyrics(false)}
          />
        </div>
      )}

      {/* Up Next panel */}
      {showUpNext && (
        <div className="max-w-3xl mx-auto md:mx-0 mb-1">
          <UpNextPanel onClose={() => setShowUpNext(false)} />
        </div>
      )}

      {/* Equalizer panel */}
      {showEQ && (
        <div className="max-w-3xl mx-auto md:mx-0 mb-1">
          <EqualizerPanel onClose={() => setShowEQ(false)} />
        </div>
      )}

      {/* Wrapper gives us a relative origin for popups that escape overflow-hidden */}
      <div className="relative max-w-3xl mx-auto md:mx-0">
        {/* Floating emoji popups — rendered outside overflow-hidden so they can float up */}
        {activePopups.length > 0 && (
          <div className="pointer-events-none absolute inset-x-2 bottom-14 h-0 z-30">
            {activePopups.map((popup) => (
              <span
                key={popup.key}
                className="absolute text-2xl leading-none animate-emoji-float"
                style={{ left: `${popup.leftPct}%` }}
                aria-hidden="true"
              >
                {popup.emoji}
              </span>
            ))}
          </div>
        )}

        {/* Floating comment popups — appear above waveform at the comment's timestamp position */}
        {activeCommentPopups.length > 0 && (
          <div className="pointer-events-none absolute inset-x-2 bottom-14 h-0 z-10">
            {activeCommentPopups.map((popup) => (
              <div
                key={popup.key}
                className="absolute bottom-2 flex flex-col items-center gap-0.5 animate-emoji-float"
                style={{ left: `${popup.leftPct}%`, transform: "translateX(-50%)" }}
                aria-hidden="true"
              >
                <div className="bg-gray-800/90 border border-violet-500/50 text-white text-xs px-2 py-1 rounded-lg shadow-lg max-w-[160px] text-center leading-tight">
                  {popup.username && (
                    <span className="block text-[10px] text-violet-400 font-medium truncate">{popup.username}</span>
                  )}
                  <span className="line-clamp-2">{popup.body}</span>
                </div>
                <ChatBubbleLeftIcon className="w-3 h-3 text-violet-400" />
              </div>
            ))}
          </div>
        )}

      <div className="bg-gray-900 dark:bg-gray-800 rounded-2xl md:rounded-none md:rounded-t-2xl shadow-2xl border border-gray-700 dark:border-gray-600">
        {/* Waveform seek bar + reaction timeline overlay */}
        <div className="relative h-12 px-2 pt-1 pb-0.5 bg-gray-900 dark:bg-gray-800 overflow-hidden rounded-t-2xl md:rounded-none md:rounded-t-2xl">
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
                <ReactionTimeline reactions={reactions} duration={duration} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 sm:gap-2 px-2 sm:px-3 py-3">
          {/* Cover art — single render; click navigates on desktop, opens drawer on mobile */}
          <button
            key={currentSong.id}
            onClick={handleCoverClick}
            className="relative flex-shrink-0 w-12 h-12 md:w-10 md:h-10 rounded-lg bg-gray-800 dark:bg-gray-700 overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-violet-500/50 transition-all"
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
              <MusicalNoteIcon className="w-5 h-5 text-gray-500" aria-hidden="true" />
            )}
          </button>

          {/* Song info — tap to expand on mobile */}
          <button
            type="button"
            className="flex-1 min-w-0 text-left"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Expand player"
          >
            <div className="flex items-center gap-1.5">
              <span
                className="text-sm font-medium text-white truncate hover:text-violet-400 transition-colors cursor-pointer"
                aria-live="polite"
              >
                {currentSong.title ?? "Untitled"}
              </span>
              {activeVersion && activeVersion.id !== currentSong.id && (
                <span className="flex-shrink-0 text-[10px] font-medium text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded">
                  Alt version
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
              {radioState ? (
                <span className="ml-auto hidden sm:inline-flex items-center gap-1 text-purple-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
                  Radio{radioState.mood ? `: ${radioState.mood}` : ""}
                </span>
              ) : playlistSource ? (
                <span className="ml-auto hidden sm:inline truncate max-w-[120px]" title={`Playing from: ${playlistSource}`}>
                  Playing from: {playlistSource}
                </span>
              ) : (
                <span className="ml-auto hidden sm:inline">
                  {currentIndex + 1} of {queue.length}
                </span>
              )}
            </div>
          </button>

          {/* Emoji reaction toggle — only when playing and authenticated */}
          {isPlaying && !!session?.user && (
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setShowReactions((v) => !v)}
                aria-label={showReactions ? "Hide reactions" : "React with emoji"}
                aria-expanded={showReactions}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                  showReactions
                    ? "text-violet-400 bg-white/10"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                <FaceSmileIcon className="w-5 h-5" />
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

          {/* Favorite button — only shown when authenticated */}
          {session?.user && (
            <button
              onClick={handleToggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`flex-shrink-0 w-8 h-8 flex items-center justify-center transition-colors ${
                isFavorite ? "text-pink-500" : "text-gray-400 hover:text-pink-400"
              }`}
            >
              {isFavorite ? (
                <HeartIcon className="w-5 h-5" />
              ) : (
                <HeartOutlineIcon className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Volume — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1 mr-1">
            <button
              onClick={toggleMute}
              aria-label={muted ? "Unmute" : "Mute"}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
            >
              {muted || volume === 0 ? (
                <SpeakerXMarkIcon className="w-4 h-4" />
              ) : (
                <SpeakerWaveIcon className="w-4 h-4" />
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

          {/* Controls — touch-friendly targets */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Shuffle */}
            <button
              onClick={toggleShuffle}
              aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
              className={`hidden md:flex w-11 h-11 rounded-full items-center justify-center transition-colors ${
                shuffle
                  ? "text-violet-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <ArrowsRightLeftIcon className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Shuffle Versions */}
            <button
              onClick={toggleShuffleVersions}
              aria-label={shuffleVersions ? "Shuffle versions on" : "Shuffle versions off"}
              title="Shuffle across versions — randomly play different versions of songs"
              className={`hidden lg:flex w-11 h-11 rounded-full items-center justify-center transition-colors ${
                shuffleVersions
                  ? "text-violet-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <CubeIcon className="w-5 h-5" aria-hidden="true" />
            </button>

            {/* Skip prev */}
            <button
              onClick={skipPrev}
              aria-label="Previous"
              className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:text-violet-400 transition-colors"
            >
              <BackwardIcon className="w-6 h-6" aria-hidden="true" />
            </button>

            {/* Play/pause */}
            <button
              onClick={() => togglePlay()}
              aria-label={isBuffering ? "Loading" : isPlaying ? "Pause" : "Play"}
              disabled={isBuffering}
              className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-75 text-white flex items-center justify-center transition-colors"
            >
              {isBuffering ? (
                <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : isPlaying ? (
                <PauseIcon className="w-6 h-6" />
              ) : (
                <PlayIcon className="w-6 h-6 ml-0.5" />
              )}
            </button>

            {/* Skip next */}
            <button
              onClick={skipNext}
              aria-label="Next"
              className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:text-violet-400 transition-colors"
            >
              <ForwardIcon className="w-6 h-6" aria-hidden="true" />
            </button>

            {/* Repeat */}
            <button
              onClick={cycleRepeat}
              aria-label={`Repeat: ${repeat}`}
              className={`hidden md:flex relative w-11 h-11 rounded-full items-center justify-center transition-colors ${
                repeat !== "off"
                  ? "text-violet-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <ArrowPathRoundedSquareIcon className="w-5 h-5" aria-hidden="true" />
              {repeat === "repeat-one" && (
                <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-violet-400">
                  1
                </span>
              )}
            </button>

            {/* Lyrics toggle — only shown when current song has lyrics */}
            {currentSong?.lyrics && (
              <button
                onClick={() => setShowLyrics((v) => !v)}
                aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
                aria-expanded={showLyrics}
                className={`hidden lg:flex w-11 h-11 rounded-full items-center justify-center transition-colors ${
                  showLyrics
                    ? "text-violet-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <DocumentTextIcon className="w-6 h-6" />
              </button>
            )}

            {/* EQ toggle */}
            <button
              onClick={() => setShowEQ((v) => !v)}
              aria-label={showEQ ? "Hide equalizer" : "Show equalizer"}
              aria-expanded={showEQ}
              className={`hidden lg:flex w-11 h-11 rounded-full items-center justify-center transition-colors ${
                showEQ
                  ? "text-violet-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <AdjustmentsHorizontalIcon className="w-6 h-6" />
            </button>

            {/* Up Next toggle */}
            <button
              onClick={() => setShowUpNext((v) => !v)}
              aria-label={showUpNext ? "Hide Up Next" : "Show Up Next"}
              aria-expanded={showUpNext}
              className={`hidden lg:flex relative w-11 h-11 rounded-full items-center justify-center transition-colors ${
                showUpNext
                  ? "text-violet-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <QueueListIcon className="w-6 h-6" />
              {queue.length - (currentIndex + 1) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-violet-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {queue.length - (currentIndex + 1)}
                </span>
              )}
            </button>

            {/* Options menu — visible on mobile/tablet where individual toggles are hidden */}
            <div ref={optionsMenuRef} className="relative flex-shrink-0 lg:hidden">
              <button
                onClick={() => setShowOptionsMenu((v) => !v)}
                aria-label="More options"
                aria-expanded={showOptionsMenu}
                aria-haspopup="true"
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  showOptionsMenu ? "text-violet-400 bg-white/10" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <EllipsisVerticalIcon className="w-6 h-6" />
              </button>
              {showOptionsMenu && (
                <div role="menu" className="absolute bottom-12 right-0 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 z-40">
                  <button
                    role="menuitem"
                    onClick={() => { toggleShuffle(); setShowOptionsMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
                  >
                    <ArrowsRightLeftIcon className={`w-5 h-5 ${shuffle ? "text-violet-400" : "text-gray-400"}`} />
                    <span className={shuffle ? "text-violet-400" : "text-gray-200"}>Shuffle {shuffle ? "on" : "off"}</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { toggleShuffleVersions(); setShowOptionsMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
                  >
                    <CubeIcon className={`w-5 h-5 ${shuffleVersions ? "text-violet-400" : "text-gray-400"}`} />
                    <span className={shuffleVersions ? "text-violet-400" : "text-gray-200"}>Shuffle versions</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { cycleRepeat(); setShowOptionsMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
                  >
                    <ArrowPathRoundedSquareIcon className={`w-5 h-5 ${repeat !== "off" ? "text-violet-400" : "text-gray-400"}`} />
                    <span className={repeat !== "off" ? "text-violet-400" : "text-gray-200"}>
                      Repeat{repeat === "repeat-one" ? " one" : repeat === "repeat-all" ? " all" : ""}
                    </span>
                  </button>
                  {currentSong?.lyrics && (
                    <button
                      role="menuitem"
                      onClick={() => { setShowLyrics((v) => !v); setShowOptionsMenu(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
                    >
                      <DocumentTextIcon className={`w-5 h-5 ${showLyrics ? "text-violet-400" : "text-gray-400"}`} />
                      <span className={showLyrics ? "text-violet-400" : "text-gray-200"}>Lyrics</span>
                    </button>
                  )}
                  <button
                    role="menuitem"
                    onClick={() => { setShowEQ((v) => !v); setShowOptionsMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
                  >
                    <AdjustmentsHorizontalIcon className={`w-5 h-5 ${showEQ ? "text-violet-400" : "text-gray-400"}`} />
                    <span className={showEQ ? "text-violet-400" : "text-gray-200"}>Equalizer</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => { setShowUpNext((v) => !v); setShowOptionsMenu(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
                  >
                    <QueueListIcon className={`w-5 h-5 ${showUpNext ? "text-violet-400" : "text-gray-400"}`} />
                    <span className={showUpNext ? "text-violet-400" : "text-gray-200"}>
                      Up Next{queue.length - (currentIndex + 1) > 0 ? ` (${queue.length - (currentIndex + 1)})` : ""}
                    </span>
                  </button>
                  <div className="border-t border-gray-700 my-1" />
                  <a
                    role="menuitem"
                    href={`/library/${currentSong.id}`}
                    onClick={() => setShowOptionsMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-200 hover:bg-white/10 transition-colors"
                  >
                    <InformationCircleIcon className="w-5 h-5 text-gray-400" />
                    <span>Song details</span>
                  </a>
                </div>
              )}
            </div>

            {/* Close */}
            <button
              onClick={clearQueue}
              aria-label="Close player"
              className="w-11 h-11 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* Expanded player drawer */}
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
