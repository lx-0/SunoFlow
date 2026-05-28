import { useRef } from "react";
import {
  ArrowPathRoundedSquareIcon,
  ArrowsRightLeftIcon,
  QueueListIcon,
  DocumentTextIcon,
  AdjustmentsHorizontalIcon,
  CubeIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
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
            ? "text-violet-400 bg-white/10"
            : "text-gray-500 hover:text-gray-300"
        }`}
      >
        <EllipsisVerticalIcon className="w-6 h-6" />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute bottom-12 right-0 w-48 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 z-40"
        >
          <button
            role="menuitem"
            onClick={() => {
              toggleShuffle();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
          >
            <ArrowsRightLeftIcon
              className={`w-5 h-5 ${shuffle ? "text-violet-400" : "text-gray-400"}`}
            />
            <span className={shuffle ? "text-violet-400" : "text-gray-200"}>
              Shuffle {shuffle ? "on" : "off"}
            </span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              toggleShuffleVersions();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
          >
            <CubeIcon
              className={`w-5 h-5 ${shuffleVersions ? "text-violet-400" : "text-gray-400"}`}
            />
            <span
              className={shuffleVersions ? "text-violet-400" : "text-gray-200"}
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
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
          >
            <ArrowPathRoundedSquareIcon
              className={`w-5 h-5 ${repeat !== "off" ? "text-violet-400" : "text-gray-400"}`}
            />
            <span
              className={repeat !== "off" ? "text-violet-400" : "text-gray-200"}
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
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
            >
              <DocumentTextIcon
                className={`w-5 h-5 ${showLyrics ? "text-violet-400" : "text-gray-400"}`}
              />
              <span
                className={showLyrics ? "text-violet-400" : "text-gray-200"}
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
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
          >
            <AdjustmentsHorizontalIcon
              className={`w-5 h-5 ${showEQ ? "text-violet-400" : "text-gray-400"}`}
            />
            <span className={showEQ ? "text-violet-400" : "text-gray-200"}>
              Equalizer
            </span>
          </button>
          <button
            role="menuitem"
            onClick={() => {
              onToggleUpNext();
              onClose();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-white/10 transition-colors"
          >
            <QueueListIcon
              className={`w-5 h-5 ${showUpNext ? "text-violet-400" : "text-gray-400"}`}
            />
            <span
              className={showUpNext ? "text-violet-400" : "text-gray-200"}
            >
              Up Next
              {queueRemaining > 0 ? ` (${queueRemaining})` : ""}
            </span>
          </button>
          <div className="border-t border-gray-700 my-1" />
          <a
            role="menuitem"
            href={`/library/${songId}`}
            onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-gray-200 hover:bg-white/10 transition-colors"
          >
            <InformationCircleIcon className="w-5 h-5 text-gray-400" />
            <span>Song details</span>
          </a>
        </div>
      )}
    </div>
  );
}
