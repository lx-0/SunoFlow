import { useRef } from "react";
import {
  ArrowLeftRight,
  Box,
  EllipsisVertical,
  FileText,
  Info,
  ListMusic,
  Repeat,
  SlidersHorizontal,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useOutsideClick } from "@/hooks/useOutsideClick";

export interface PlayerOptionsMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  shuffle: boolean;
  shuffleVersions: boolean;
  repeat: string;
  showLyrics: boolean;
  showEQ: boolean;
  showUpNext: boolean;
  hasLyrics: boolean;
  queueRemaining: number;
  songId: string;
  toggleShuffle: () => void;
  toggleShuffleVersions: () => void;
  cycleRepeat: () => void;
  onToggleLyrics: () => void;
  onToggleEQ: () => void;
  onToggleUpNext: () => void;
}

export function PlayerOptionsMenu({
  isOpen,
  onToggle,
  onClose,
  shuffle,
  shuffleVersions,
  repeat,
  showLyrics,
  showEQ,
  showUpNext,
  hasLyrics,
  queueRemaining,
  songId,
  toggleShuffle,
  toggleShuffleVersions,
  cycleRepeat,
  onToggleLyrics,
  onToggleEQ,
  onToggleUpNext,
}: PlayerOptionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, onClose, isOpen);

  return (
    <div ref={menuRef} className="relative flex-shrink-0 lg:hidden">
      <button
        onClick={onToggle}
        aria-label="More options"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
          isOpen
            ? "text-violet-400 bg-surface-hover"
            : "text-muted hover:text-secondary"
        }`}
      >
        <Icon icon={EllipsisVertical} className="w-6 h-6" />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute bottom-12 right-0 w-48 bg-surface-raised border border-border rounded-xl shadow-2xl py-1 z-40"
        >
          <button
            role="menuitem"
            onClick={() => {
              toggleShuffle();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-surface-hover transition-colors"
          >
            <Icon
              icon={ArrowLeftRight}
              className={`w-5 h-5 ${shuffle ? "text-violet-400" : "text-secondary"}`}
            />
            <span className={shuffle ? "text-violet-400" : "text-primary"}>
              Shuffle {shuffle ? "on" : "off"}
            </span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              toggleShuffleVersions();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-surface-hover transition-colors"
          >
            <Icon
              icon={Box}
              className={`w-5 h-5 ${shuffleVersions ? "text-violet-400" : "text-secondary"}`}
            />
            <span
              className={shuffleVersions ? "text-violet-400" : "text-primary"}
            >
              Shuffle versions
            </span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              cycleRepeat();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-surface-hover transition-colors"
          >
            <Icon
              icon={Repeat}
              className={`w-5 h-5 ${repeat !== "off" ? "text-violet-400" : "text-secondary"}`}
            />
            <span
              className={repeat !== "off" ? "text-violet-400" : "text-primary"}
            >
              Repeat
              {repeat === "repeat-one"
                ? " one"
                : repeat === "repeat-all"
                  ? " all"
                  : ""}
            </span>
          </button>
          {hasLyrics && (
            <button
              role="menuitem"
              onClick={() => {
                onToggleLyrics();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-surface-hover transition-colors"
            >
              <Icon
                icon={FileText}
                className={`w-5 h-5 ${showLyrics ? "text-violet-400" : "text-secondary"}`}
              />
              <span
                className={showLyrics ? "text-violet-400" : "text-primary"}
              >
                Lyrics
              </span>
            </button>
          )}
          <button
            role="menuitem"
            onClick={() => {
              onToggleEQ();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-surface-hover transition-colors"
          >
            <Icon
              icon={SlidersHorizontal}
              className={`w-5 h-5 ${showEQ ? "text-violet-400" : "text-secondary"}`}
            />
            <span className={showEQ ? "text-violet-400" : "text-primary"}>
              Equalizer
            </span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onToggleUpNext();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-surface-hover transition-colors"
          >
            <Icon
              icon={ListMusic}
              className={`w-5 h-5 ${showUpNext ? "text-violet-400" : "text-secondary"}`}
            />
            <span
              className={showUpNext ? "text-violet-400" : "text-primary"}
            >
              Up Next
              {queueRemaining > 0 ? ` (${queueRemaining})` : ""}
            </span>
          </button>
          <div className="border-t border-border my-1" />
          <a
            role="menuitem"
            href={`/library/${songId}`}
            onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-primary hover:bg-surface-hover transition-colors"
          >
            <Icon icon={Info} className="w-5 h-5 text-secondary" />
            <span>Song details</span>
          </a>
        </div>
      )}
    </div>
  );
}
