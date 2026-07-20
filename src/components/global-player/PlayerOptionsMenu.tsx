import { useRef, useState } from "react";
import {
  ArrowLeftRight,
  Box,
  ChevronLeft,
  EllipsisVertical,
  FileText,
  Info,
  ListMusic,
  ListPlus,
  Repeat,
  SlidersHorizontal,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { useToast } from "../Toast";
import {
  addSongToPlaylist,
  fetchPlaylistOptions,
  type LibraryPlaylistOption,
} from "@/lib/songs/library-client";

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
  const { toast } = useToast();
  const [view, setView] = useState<"main" | "playlists">("main");
  const [playlists, setPlaylists] = useState<LibraryPlaylistOption[]>([]);
  const [loadingPlaylists, setLoadingPlaylists] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const close = () => {
    setView("main");
    close();
  };
  useOutsideClick(menuRef, close, isOpen);

  async function openPlaylists() {
    setView("playlists");
    setLoadingPlaylists(true);
    try {
      setPlaylists(await fetchPlaylistOptions());
    } finally {
      setLoadingPlaylists(false);
    }
  }

  async function addToPlaylist(playlistId: string) {
    setAddingId(playlistId);
    try {
      const result = await addSongToPlaylist(playlistId, songId);
      toast(result.ok ? "Added to playlist" : result.error, result.ok ? "success" : "error");
      if (result.ok) close();
    } catch {
      toast("Failed to add to playlist", "error");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div ref={menuRef} className="relative flex-shrink-0 lg:hidden">
      <button
        onClick={() => {
          if (!isOpen) setView("main");
          onToggle();
        }}
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
          className="absolute bottom-12 right-0 w-56 max-w-[calc(100vw-1rem)] max-h-[70vh] overflow-y-auto bg-surface-raised border border-border rounded-xl shadow-2xl py-1 z-40"
        >
          {view === "main" ? (
          <>
          <button
            role="menuitem"
            onClick={() => {
              toggleShuffle();
              close();
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
              close();
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
              close();
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
                close();
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
              close();
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
              close();
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
          <button
            role="menuitem"
            onClick={openPlaylists}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-surface-hover transition-colors"
          >
            <Icon icon={ListPlus} className="w-5 h-5 text-secondary" />
            <span className="text-primary">Add to playlist</span>
          </button>
          <div className="border-t border-border my-1" />
          <a
            role="menuitem"
            href={`/library/${songId}`}
            onClick={close}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left text-primary hover:bg-surface-hover transition-colors"
          >
            <Icon icon={Info} className="w-5 h-5 text-secondary" />
            <span>Song details</span>
          </a>
          </>
          ) : (
          <>
            <button
              onClick={() => setView("main")}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left text-secondary hover:bg-surface-hover transition-colors"
            >
              <Icon icon={ChevronLeft} className="w-4 h-4" />
              <span>Add to playlist</span>
            </button>
            <div className="border-t border-border my-1" />
            {loadingPlaylists ? (
              <p className="px-4 py-3 text-sm text-secondary">Loading…</p>
            ) : playlists.length === 0 ? (
              <p className="px-4 py-3 text-sm text-secondary">No playlists yet</p>
            ) : (
              playlists.map((pl) => (
                <button
                  key={pl.id}
                  role="menuitem"
                  onClick={() => addToPlaylist(pl.id)}
                  disabled={addingId === pl.id}
                  className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm text-left text-primary hover:bg-surface-hover transition-colors disabled:opacity-50"
                >
                  <span className="truncate">{pl.name}</span>
                  <span className="text-xs text-secondary flex-shrink-0">
                    {pl._count.songs}
                  </span>
                </button>
              ))
            )}
          </>
          )}
        </div>
      )}
    </div>
  );
}
