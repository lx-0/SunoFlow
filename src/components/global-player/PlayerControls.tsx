import {
  ArrowLeftRight,
  Box,
  FastForward,
  FileText,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Rewind,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "../Spinner";

export interface PlayerControlsProps {
  isPlaying: boolean;
  isBuffering: boolean;
  shuffle: boolean;
  shuffleVersions: boolean;
  repeat: string;
  showLyrics: boolean;
  showEQ: boolean;
  showUpNext: boolean;
  hasLyrics: boolean;
  queueRemaining: number;
  togglePlay: () => void;
  skipNext: () => void;
  skipPrev: () => void;
  toggleShuffle: () => void;
  toggleShuffleVersions: () => void;
  cycleRepeat: () => void;
  clearQueue: () => void;
  onToggleLyrics: () => void;
  onToggleEQ: () => void;
  onToggleUpNext: () => void;
}

export function PlayerControls({
  isPlaying,
  isBuffering,
  shuffle,
  shuffleVersions,
  repeat,
  showLyrics,
  showEQ,
  showUpNext,
  hasLyrics,
  queueRemaining,
  togglePlay,
  skipNext,
  skipPrev,
  toggleShuffle,
  toggleShuffleVersions,
  cycleRepeat,
  clearQueue,
  onToggleLyrics,
  onToggleEQ,
  onToggleUpNext,
}: PlayerControlsProps) {
  return (
    <>
      <button
        onClick={toggleShuffle}
        aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
        className={`hidden md:flex w-11 h-11 rounded-full items-center justify-center transition-colors ${
          shuffle ? "text-violet-400" : "text-muted hover:text-secondary"
        }`}
      >
        <Icon icon={ArrowLeftRight} className="w-5 h-5" aria-hidden="true" />
      </button>

      <button
        onClick={toggleShuffleVersions}
        aria-label={
          shuffleVersions ? "Shuffle versions on" : "Shuffle versions off"
        }
        title="Shuffle across versions — randomly play different versions of songs"
        className={`hidden lg:flex w-11 h-11 rounded-full items-center justify-center transition-colors ${
          shuffleVersions
            ? "text-violet-400"
            : "text-muted hover:text-secondary"
        }`}
      >
        <Icon icon={Box} className="w-5 h-5" aria-hidden="true" />
      </button>

      <button
        onClick={skipPrev}
        aria-label="Previous"
        className="w-11 h-11 rounded-full flex items-center justify-center text-primary hover:text-violet-400 transition-colors"
      >
        <Icon
          icon={Rewind}
          className="w-6 h-6"
          fill="currentColor"
          aria-hidden="true"
        />
      </button>

      <button
        onClick={() => togglePlay()}
        aria-label={isBuffering ? "Loading" : isPlaying ? "Pause" : "Play"}
        disabled={isBuffering}
        className="w-12 h-12 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-75 text-white flex items-center justify-center transition-colors"
      >
        {isBuffering ? (
          <Spinner className="w-6 h-6" />
        ) : isPlaying ? (
          <Icon icon={Pause} className="w-6 h-6" fill="currentColor" />
        ) : (
          <Icon icon={Play} className="w-6 h-6 ml-0.5" fill="currentColor" />
        )}
      </button>

      <button
        onClick={skipNext}
        aria-label="Next"
        className="w-11 h-11 rounded-full flex items-center justify-center text-primary hover:text-violet-400 transition-colors"
      >
        <Icon
          icon={FastForward}
          className="w-6 h-6"
          fill="currentColor"
          aria-hidden="true"
        />
      </button>

      <button
        onClick={cycleRepeat}
        aria-label={`Repeat: ${repeat}`}
        className={`hidden md:flex relative w-11 h-11 rounded-full items-center justify-center transition-colors ${
          repeat !== "off"
            ? "text-violet-400"
            : "text-muted hover:text-secondary"
        }`}
      >
        <Icon icon={Repeat} className="w-5 h-5" aria-hidden="true" />
        {repeat === "repeat-one" && (
          <span className="absolute -top-0.5 -right-0.5 text-[8px] font-bold text-violet-400">
            1
          </span>
        )}
      </button>

      {hasLyrics && (
        <button
          onClick={onToggleLyrics}
          aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
          aria-expanded={showLyrics}
          className={`hidden lg:flex w-11 h-11 rounded-full items-center justify-center transition-colors ${
            showLyrics
              ? "text-violet-400"
              : "text-muted hover:text-secondary"
          }`}
        >
          <Icon icon={FileText} className="w-6 h-6" />
        </button>
      )}

      <button
        onClick={onToggleEQ}
        aria-label={showEQ ? "Hide equalizer" : "Show equalizer"}
        aria-expanded={showEQ}
        className={`hidden lg:flex w-11 h-11 rounded-full items-center justify-center transition-colors ${
          showEQ ? "text-violet-400" : "text-muted hover:text-secondary"
        }`}
      >
        <Icon icon={SlidersHorizontal} className="w-6 h-6" />
      </button>

      <button
        onClick={onToggleUpNext}
        aria-label={showUpNext ? "Hide Up Next" : "Show Up Next"}
        aria-expanded={showUpNext}
        className={`hidden lg:flex relative w-11 h-11 rounded-full items-center justify-center transition-colors ${
          showUpNext
            ? "text-violet-400"
            : "text-muted hover:text-secondary"
        }`}
      >
        <Icon icon={ListMusic} className="w-6 h-6" />
        {queueRemaining > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 bg-violet-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
            {queueRemaining}
          </span>
        )}
      </button>

      <button
        onClick={clearQueue}
        aria-label="Close player"
        className="w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-secondary transition-colors"
      >
        <Icon icon={X} className="w-6 h-6" />
      </button>
    </>
  );
}
