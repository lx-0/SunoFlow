"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Box,
  ExternalLink,
  FastForward,
  FileText,
  Heart,
  ListMusic,
  Music,
  Pause,
  Play,
  Repeat,
  Rewind,
  SlidersHorizontal,
  Smile,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "./Spinner";
import { CoverArtImage } from "./CoverArtImage";
import { useQueue } from "./QueueContext";
import { PlayerWaveform } from "./PlayerWaveform";
import { EmojiReactionPicker } from "./EmojiReactionPicker";
import { ReactionTimeline, ReactionItem } from "./ReactionTimeline";
import { UpNextPanel } from "./UpNextPanel";
import { LyricsPanel } from "./LyricsPanel";
import { EqualizerPanel } from "./EqualizerPanel";
import { getCurrentQueueSong } from "@/components/queue/queue-selectors";
import { formatDuration as formatTime } from "@/lib/time-format";

type ExpandedTab = "none" | "lyrics" | "queue" | "eq";

interface ExpandedPlayerProps {
  isFavorite: boolean;
  onToggleFavorite: () => void;
  reactions: ReactionItem[];
  onReact: (emoji: string) => void;
  isAuthenticated: boolean;
  onClose?: () => void;
}

export function ExpandedPlayer({
  isFavorite,
  onToggleFavorite,
  reactions,
  onReact,
  isAuthenticated,
  onClose,
}: ExpandedPlayerProps) {
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
    togglePlay,
    skipNext,
    skipPrev,
    seek,
    toggleShuffle,
    cycleRepeat,
    setVolume,
    toggleMute,
    shuffleVersions,
    toggleShuffleVersions,
  } = useQueue();

  const [activeTab, setActiveTab] = useState<ExpandedTab>("none");
  const [showReactions, setShowReactions] = useState(false);

  const currentSong = getCurrentQueueSong(queue, currentIndex);

  const toggleTab = useCallback((tab: ExpandedTab) => {
    setActiveTab((prev) => (prev === tab ? "none" : tab));
  }, []);

  if (!currentSong) return null;

  return (
    <div className="w-full h-full md:h-auto md:max-h-[90vh] flex flex-col overflow-hidden md:overflow-y-auto">
      {/* Upper scrollable region — compresses when a panel is open (mobile).
          On desktop it keeps its natural height (md:flex-none) so the whole
          modal scrolls instead of the region shrinking and spilling its
          overflow-visible content over the tab row below. */}
      <div className="flex-1 min-h-0 overflow-y-auto md:flex-none md:overflow-visible flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-center px-4 py-2 flex-shrink-0">
        <span className="text-xs text-muted uppercase tracking-wider">Now Playing</span>
      </div>

      {/* Cover art */}
      <div className="flex-shrink-0 flex justify-center px-8 py-4">
        <div className="relative w-60 h-60 sm:w-72 sm:h-72 rounded-2xl bg-surface-raised overflow-hidden shadow-2xl">
          {currentSong.imageUrl ? (
            <CoverArtImage
              src={currentSong.imageUrl}
              alt={currentSong.title ?? "Song"}
              fill
              className="object-cover"
              sizes="288px"
              songId={currentSong.id}
              fallbackSrc="/icons/icon-512.png"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon icon={Music} className="w-20 h-20 text-muted" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {/* Song info */}
      <div className="px-6 py-2 text-center flex-shrink-0">
        <h2 className="text-lg font-semibold text-primary">{currentSong.title ?? "Untitled"}</h2>
        <Link
          href={`/library/${currentSong.id}`}
          onClick={() => onClose?.()}
          aria-label="View song details"
          className="mt-1 inline-flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded transition-colors"
        >
          <span>View song details</span>
          <Icon icon={ExternalLink} className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Waveform + reaction timeline */}
      <div className="relative px-6 py-2 flex-shrink-0">
        <div className="h-14">
          <PlayerWaveform
            songId={currentSong.id}
            currentTime={currentTime}
            duration={duration}
            isBuffering={isBuffering}
            onSeek={seek}
            reactionTimestamps={reactions.map((r) => r.timestamp)}
            commentTimestamps={[]}
          />
        </div>
        {reactions.length > 0 && duration > 0 && (
          <div className="absolute inset-x-6 top-2 bottom-2 pointer-events-none">
            <div className="pointer-events-auto">
              <ReactionTimeline reactions={reactions} duration={duration} />
            </div>
          </div>
        )}
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-4 px-6 py-4 flex-shrink-0">
        <button
          onClick={toggleShuffle}
          aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            shuffle ? "text-violet-400" : "text-muted hover:text-secondary"
          }`}
        >
          <Icon icon={ArrowLeftRight} className="w-5 h-5" />
        </button>

        <button
          onClick={skipPrev}
          aria-label="Previous"
          className="w-12 h-12 flex items-center justify-center text-primary hover:text-violet-400 transition-colors"
        >
          <Icon icon={Rewind} className="w-7 h-7" fill="currentColor" />
        </button>

        <button
          onClick={() => togglePlay()}
          aria-label={isBuffering ? "Loading" : isPlaying ? "Pause" : "Play"}
          disabled={isBuffering}
          className="w-16 h-16 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-75 text-white flex items-center justify-center transition-colors"
        >
          {isBuffering ? (
            <Spinner className="w-8 h-8" />
          ) : isPlaying ? (
            <Icon icon={Pause} className="w-8 h-8" fill="currentColor" />
          ) : (
            <Icon icon={Play} className="w-8 h-8 ml-1" fill="currentColor" />
          )}
        </button>

        <button
          onClick={skipNext}
          aria-label="Next"
          className="w-12 h-12 flex items-center justify-center text-primary hover:text-violet-400 transition-colors"
        >
          <Icon icon={FastForward} className="w-7 h-7" fill="currentColor" />
        </button>

        <button
          onClick={cycleRepeat}
          aria-label={`Repeat: ${repeat}`}
          className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${
            repeat !== "off" ? "text-violet-400" : "text-muted hover:text-secondary"
          }`}
        >
          <Icon icon={Repeat} className="w-5 h-5" />
          {repeat === "repeat-one" && (
            <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-violet-400">1</span>
          )}
        </button>
      </div>

      {/* Secondary controls row */}
      <div className="flex items-center justify-center gap-2 px-6 pb-2 flex-shrink-0">
        {/* Volume */}
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          className="w-8 h-8 flex items-center justify-center text-secondary hover:text-primary transition-colors"
        >
          {muted || volume === 0 ? (
            <Icon icon={VolumeX} className="w-5 h-5" />
          ) : (
            <Icon icon={Volume2} className="w-5 h-5" />
          )}
        </button>
        <input
          type="range"
          min={0}
          max={100}
          value={muted ? 0 : Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          aria-label="Volume"
          className="w-24 h-1 accent-violet-500 cursor-pointer"
        />

        {/* Shuffle versions */}
        <button
          onClick={toggleShuffleVersions}
          aria-label={shuffleVersions ? "Shuffle versions on" : "Shuffle versions off"}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            shuffleVersions ? "text-violet-400" : "text-muted hover:text-secondary"
          }`}
        >
          <Icon icon={Box} className="w-5 h-5" />
        </button>

        {/* Emoji reactions */}
        {isPlaying && isAuthenticated && (
          <div className="relative">
            <button
              onClick={() => setShowReactions((v) => !v)}
              aria-label={showReactions ? "Hide reactions" : "React with emoji"}
              aria-expanded={showReactions}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                showReactions ? "text-violet-400 bg-surface-hover" : "text-secondary hover:text-primary"
              }`}
            >
              <Icon icon={Smile} className="w-5 h-5" />
            </button>
            {showReactions && (
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30">
                <EmojiReactionPicker
                  isPlaying={isPlaying}
                  isAuthenticated={isAuthenticated}
                  onReact={onReact}
                  reactionEmojis={reactions.map((r) => r.emoji)}
                />
              </div>
            )}
          </div>
        )}

        {/* Favorite */}
        {isAuthenticated && (
          <button
            onClick={onToggleFavorite}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
            className={`w-8 h-8 flex items-center justify-center transition-colors ${
              isFavorite ? "text-pink-500" : "text-secondary hover:text-pink-400"
            }`}
          >
            {isFavorite ? <Icon icon={Heart} className="w-5 h-5" fill="currentColor" /> : <Icon icon={Heart} className="w-5 h-5" />}
          </button>
        )}
      </div>

      </div>
      {/* /Upper scrollable region */}

      {/* Tab buttons for inline panels */}
      <div className="flex items-center justify-center gap-1 px-6 py-2 border-t border-border flex-shrink-0">
        {currentSong.lyrics && (
          <button
            onClick={() => toggleTab("lyrics")}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${
              activeTab === "lyrics" ? "bg-violet-600 text-white" : "text-secondary hover:text-primary hover:bg-surface-hover"
            }`}
          >
            <Icon icon={FileText} className="w-4 h-4 inline mr-1" />
            Lyrics
          </button>
        )}
        <button
          onClick={() => toggleTab("queue")}
          className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${
            activeTab === "queue" ? "bg-violet-600 text-white" : "text-secondary hover:text-primary hover:bg-surface-hover"
          }`}
        >
          <Icon icon={ListMusic} className="w-4 h-4 inline mr-1" />
          Up Next
        </button>
        <button
          onClick={() => toggleTab("eq")}
          className={`px-4 py-2 text-xs font-medium rounded-full transition-colors ${
            activeTab === "eq" ? "bg-violet-600 text-white" : "text-secondary hover:text-primary hover:bg-surface-hover"
          }`}
        >
          <Icon icon={SlidersHorizontal} className="w-4 h-4 inline mr-1" />
          EQ
        </button>
      </div>

      {/* Inline panel content */}
      {activeTab !== "none" && (
        <div className="flex-1 min-h-0 overflow-y-auto md:flex-initial md:max-h-[50vh] px-4 pb-safe border-t border-border">
          {activeTab === "lyrics" && currentSong.lyrics && (
            <LyricsPanel
              lyrics={currentSong.lyrics}
              songTitle={currentSong.title ?? "Untitled"}
              onClose={() => setActiveTab("none")}
            />
          )}
          {activeTab === "queue" && (
            <UpNextPanel onClose={() => setActiveTab("none")} />
          )}
          {activeTab === "eq" && (
            <EqualizerPanel onClose={() => setActiveTab("none")} />
          )}
        </div>
      )}

      {/* Bottom safe area spacer for mobile */}
      <div className="h-safe flex-shrink-0 md:hidden" />
    </div>
  );
}
