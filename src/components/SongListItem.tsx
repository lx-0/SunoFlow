"use client";

import { memo, useRef, useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Music,
  Download,
  Heart,
  Check,
  RefreshCw,
  EllipsisVertical,
  Archive,
  Undo2,
  Trash2,
  FastForward,
  ListMusic,
  WifiOff,
  CloudDownload,
  SwatchBook,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { CoverArtImage } from "./CoverArtImage";
import type { Song } from "@prisma/client";
import type { SongRating } from "@/lib/ratings";
import { useToast } from "./Toast";
import { useQueue, type QueueSong } from "./QueueContext";
import { TagChip } from "./TagInput";
import { ShareButton } from "./ShareButton";
import { AddToPlaylistButton } from "./AddToPlaylistButton";
import { useRouter } from "next/navigation";
import { HighlightText } from "./HighlightText";
import { useOutsideClick } from "@/hooks/useOutsideClick";
import { formatDuration as formatTime } from "@/lib/time-format";
import { firstTag } from "@sunoflow/core";
import { useLongPress } from "./song-list-item/use-long-press";
import { useSongTracking } from "./song-list-item/use-song-tracking";
import { useSaveStyleTemplate } from "./song-list-item/use-save-style-template";
import { Spinner } from "./Spinner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SongTagRelation {
  tag: { id: string; name: string; color: string };
}

type SongWithTags = Song & { songTags: SongTagRelation[] };

function StarDisplay({ stars }: { stars: number }) {
  return (
    <span className="text-yellow-400 text-xs" role="img" aria-label={`${stars} out of 5 stars`}>
      {"★".repeat(stars)}
      {"☆".repeat(5 - stars)}
    </span>
  );
}

// ─── Inline audio player bar ──────────────────────────────────────────────────

interface PlayerBarProps {
  currentTime: number;
  duration: number;
  hasAudio: boolean;
  onSeek: (pct: number) => void;
}

function PlayerBar({ currentTime, duration, hasAudio, onSeek }: PlayerBarProps) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="mt-2 space-y-1">
      <div className="relative h-1.5 bg-surface-raised rounded-full">
        <div
          className="absolute inset-y-0 left-0 bg-violet-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={0}
          max={100}
          value={pct}
          disabled={!hasAudio}
          onChange={(e) => onSeek(Number(e.target.value) / 100)}
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full opacity-0 cursor-pointer disabled:cursor-default min-h-[44px]"
          aria-label="Seek"
        />
      </div>
      <div className="flex justify-between text-xs text-secondary">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

// ─── Status badges ────────────────────────────────────────────────────────────

function GeneratingBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/50 border border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 text-xs font-medium">
      <Spinner className="h-3 w-3" />
      Generating…
    </span>
  );
}

function FailedBadge({ message }: { message?: string | null }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-xs font-medium"
      title={message ?? "Generation failed"}
    >
      Failed
    </span>
  );
}

// ─── Per-song action menu (three-dot/kebab) ───────────────────────────────────

interface SongRowMenuProps {
  song: Song;
  isArchiveView: boolean;
  hasAudio: boolean;
  onToggleFavorite: (song: Song) => void;
  onSongUpdate: (updated: Partial<Song>) => void;
  onDownload: (song: Song) => void;
  onSingleArchive: (song: Song) => void;
  onSingleRestore: (song: Song) => void;
  onSingleDeleteForever: (song: Song) => void;
}

function SongRowMenu({
  song,
  isArchiveView,
  hasAudio,
  onToggleFavorite,
  onSongUpdate,
  onDownload,
  onSingleArchive,
  onSingleRestore,
  onSingleDeleteForever,
}: SongRowMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { playNext, addToQueue } = useQueue();
  const { toast } = useToast();
  const router = useRouter();
  const {
    saveStyleOpen,
    styleTemplateName,
    setStyleTemplateName,
    styleTemplateTags,
    setStyleTemplateTags,
    isSavingStyle,
    openSaveStyle,
    closeSaveStyle,
    submitSaveStyle,
  } = useSaveStyleTemplate();

  useOutsideClick(menuRef, () => setOpen(false), open);

  const itemClass =
    "w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-hover transition-colors border-b border-border flex items-center gap-2";

  return (
    <div className="relative ml-auto" ref={menuRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label="More actions"
        className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-primary transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
      >
        <Icon icon={EllipsisVertical} className="w-5 h-5" aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-1 w-48 bg-surface border border-border rounded-xl shadow-lg z-30 overflow-hidden">
          <button
            onClick={() => { setOpen(false); onToggleFavorite(song); }}
            className={itemClass}
          >
            {song.isFavorite
              ? <Icon icon={Heart} fill="currentColor" className="w-4 h-4 text-pink-500 flex-shrink-0" />
              : <Icon icon={Heart} className="w-4 h-4 flex-shrink-0" />}
            {song.isFavorite ? "Unfavorite" : "Favorite"}
          </button>
          {hasAudio && (
            <button
              onClick={() => {
                setOpen(false);
                const qs: QueueSong = { id: song.id, title: song.title, audioUrl: song.audioUrl!, imageUrl: song.imageUrl, duration: song.duration, lyrics: song.lyrics };
                playNext(qs);
                toast("Playing next", "success");
              }}
              className={itemClass}
            >
              <Icon icon={FastForward} className="w-4 h-4 flex-shrink-0" />
              Play Next
            </button>
          )}
          {hasAudio && (
            <button
              onClick={() => {
                setOpen(false);
                const qs: QueueSong = { id: song.id, title: song.title, audioUrl: song.audioUrl!, imageUrl: song.imageUrl, duration: song.duration, lyrics: song.lyrics };
                addToQueue(qs);
                toast("Added to queue", "success");
              }}
              className={itemClass}
            >
              <Icon icon={ListMusic} className="w-4 h-4 flex-shrink-0" />
              Add to Queue
            </button>
          )}
          {hasAudio && (
            <ShareButton
              song={song}
              onUpdate={(updated) => {
              setOpen(false);
              onSongUpdate({ ...updated, isPublic: updated.isPublic ?? false });
            }}
              compact={false}
              source="library_card_menu"
              className={itemClass}
            />
          )}
          {hasAudio && (
            <button
              onClick={() => { setOpen(false); onDownload(song); }}
              className={itemClass}
            >
              <Icon icon={Download} className="w-4 h-4 flex-shrink-0" />
              Download
            </button>
          )}
          {!isArchiveView && song.tags && (
            <button
              onClick={() => {
                setOpen(false);
                openSaveStyle(song.tags!);
              }}
              className={itemClass}
            >
              <Icon icon={SwatchBook} className="w-4 h-4 flex-shrink-0" />
              Save Style
            </button>
          )}
          {!isArchiveView && (
            <button
              onClick={() => { setOpen(false); router.push(`/library/${song.id}`); }}
              className={itemClass}
            >
              <Icon icon={RefreshCw} className="w-4 h-4 flex-shrink-0" />
              Create Variation
            </button>
          )}
          {isArchiveView ? (
            <>
              <button
                onClick={() => { setOpen(false); onSingleRestore(song); }}
                className={itemClass}
              >
                <Icon icon={Undo2} className="w-4 h-4 text-green-500 flex-shrink-0" />
                Restore
              </button>
              <button
                onClick={() => { setOpen(false); onSingleDeleteForever(song); }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2"
              >
                <Icon icon={Trash2} className="w-4 h-4 flex-shrink-0" />
                Delete forever
              </button>
            </>
          ) : (
            <button
              onClick={() => { setOpen(false); onSingleArchive(song); }}
              className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface-hover transition-colors flex items-center gap-2"
            >
              <Icon icon={Archive} className="w-4 h-4 flex-shrink-0" />
              Archive
            </button>
          )}
        </div>
      )}

      {saveStyleOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={closeSaveStyle}
        >
          <div
            className="bg-surface rounded-xl shadow-xl p-5 w-80 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-primary">Save as Style Template</h3>
            <input
              type="text"
              placeholder="Template name"
              value={styleTemplateName}
              onChange={(e) => setStyleTemplateName(e.target.value)}
              autoFocus
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <textarea
              value={styleTemplateTags}
              onChange={(e) => setStyleTemplateTags(e.target.value)}
              rows={2}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2 text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeSaveStyle}
                className="px-3 py-1.5 text-sm text-secondary hover:text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!styleTemplateName.trim() || !styleTemplateTags.trim() || isSavingStyle}
                onClick={() => submitSaveStyle(song.id)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {isSavingStyle ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SongListItem Props ──────────────────────────────────────────────────────

export interface SongListItemProps {
  initialSong: Song;
  isActive: boolean;
  isPlaying: boolean;
  currentTime: number;
  audioDuration: number;
  rating: SongRating | undefined;
  downloadProgress: number | null;
  downloadError: string | null;
  isSelected: boolean;
  selectionMode: boolean;
  searchQuery?: string;
  isCached: boolean;
  isSaving: boolean;
  isOnline: boolean;
  onTogglePlay: (song: Song) => void;
  onDownload: (song: Song) => void;
  onSaveOffline: (song: Song) => void;
  onRemoveOffline: (songId: string) => void;
  onSeek: (pct: number) => void;
  onUpdate: (updated: Song) => void;
  onToggleFavorite: (song: Song) => void;
  onToggleSelect: (songId: string, shiftKey: boolean) => void;
  onLongPress: (songId: string) => void;
  onRetry: (song: Song) => void;
  retryingId: string | null;
  isArchiveView: boolean;
  onSingleArchive: (song: Song) => void;
  onSingleRestore: (song: Song) => void;
  onSingleDeleteForever: (song: Song) => void;
  onTagClick?: (tagId: string) => void;
}

// ─── SongListItem ────────────────────────────────────────────────────────────

export const SongListItem = memo(function SongListItem({
  initialSong,
  isActive,
  isPlaying,
  currentTime,
  audioDuration,
  rating,
  downloadProgress,
  downloadError,
  isSelected,
  selectionMode,
  searchQuery = "",
  isCached,
  isSaving,
  isOnline,
  onTogglePlay,
  onDownload,
  onSaveOffline,
  onRemoveOffline,
  onSeek,
  onUpdate,
  onToggleFavorite,
  onToggleSelect,
  onLongPress,
  onRetry,
  retryingId,
  isArchiveView,
  onSingleArchive,
  onSingleRestore,
  onSingleDeleteForever,
  onTagClick,
}: SongListItemProps) {
  const { song, setSong, isPending, isFailed, hasAudio } = useSongTracking(initialSong, onUpdate);
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useLongPress(() => onLongPress(song.id));

  const isRetrying = retryingId === song.id;
  const isDownloading = downloadProgress !== null;

  const songTitle = song.title ?? "Untitled";
  const statusText = isPending ? ", generating" : isFailed ? ", failed" : "";
  const ratingText = rating ? `, ${rating.stars} of 5 stars` : "";
  const songAriaLabel = `${songTitle}${statusText}${ratingText}`;

  return (
    <div
      role="option"
      tabIndex={0}
      aria-label={songAriaLabel}
      onKeyDown={(e) => {
        if (!hasAudio) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTogglePlay(song);
        }
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      aria-selected={isActive}
      className={`group bg-surface border rounded-xl transition-colors ${
        isSelected
          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
          : isActive
            ? "border-violet-600"
            : "border-border"
      } ${isPending ? "opacity-75" : ""}`}
    >
      <div className="flex items-center gap-3 px-3 pt-3 pb-1">
        {/* Selection checkbox */}
        <button
          onClick={(e) => onToggleSelect(song.id, e.shiftKey)}
          aria-label={isSelected ? "Deselect song" : "Select song"}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100 sm:opacity-0 sm:hover:opacity-100"
          } ${
            isSelected
              ? "bg-violet-600 border-violet-600 text-white"
              : "border-border-strong hover:border-violet-400"
          }`}
        >
          {isSelected && <Icon icon={Check} className="w-4 h-4" />}
        </button>

        <div className="relative flex-shrink-0 w-12 h-12 rounded-lg bg-surface-raised overflow-hidden flex items-center justify-center">
          {song.imageUrl ? (
            <CoverArtImage src={song.imageUrl} alt={song.title ?? "Song"} fill className="object-cover" sizes="48px" loading="lazy" songId={song.id} />
          ) : (
            <Icon icon={Music} className="w-6 h-6 text-muted" aria-hidden="true" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Link
            href={`/library/${song.id}`}
            className="block text-sm font-medium text-primary truncate hover:text-violet-400 transition-colors"
          >
            <HighlightText text={song.title ?? "Untitled"} query={searchQuery} />
          </Link>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {isPending && <GeneratingBadge />}
            {isFailed && <FailedBadge message={song.errorMessage} />}
            {!isPending && !isFailed && (song as SongWithTags).songTags?.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {(song as SongWithTags).songTags.slice(0, 3).map((st) => (
                  <TagChip key={st.tag.id} tag={st.tag} size="xs" onClick={() => onTagClick?.(st.tag.id)} />
                ))}
                {(song as SongWithTags).songTags.length > 3 && (
                  <span className="text-[10px] text-secondary">+{(song as SongWithTags).songTags.length - 3}</span>
                )}
              </div>
            )}
            {!isPending && !isFailed && !((song as SongWithTags).songTags?.length > 0) && song.tags && (
              <span className="text-xs text-secondary truncate">
                {firstTag(song.tags)}
              </span>
            )}
            {!isPending && song.duration && (
              <span className="text-xs text-secondary flex-shrink-0">
                {formatTime(song.duration)}
              </span>
            )}
            {!isOnline && !isCached && hasAudio && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400 flex-shrink-0">
                <Icon icon={WifiOff} className="w-3 h-3" aria-hidden="true" />
                Unavailable offline
              </span>
            )}
            {isCached && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 flex-shrink-0" title="Available offline">
                <Icon icon={Check} className="w-3 h-3" aria-hidden="true" />
                Offline
              </span>
            )}
            {!isPending && !isFailed && ((song as Song & { variationCount?: number }).variationCount ?? 0) > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-surface-raised border border-border text-secondary text-[10px] font-medium">
                {((song as Song & { variationCount?: number }).variationCount ?? 0) + 1} versions
              </span>
            )}
            {song.source === "auto" && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 text-[10px] font-medium">
                Auto
              </span>
            )}
          </div>
          {rating && (
            <div className="mt-0.5">
              <StarDisplay stars={rating.stars} />
            </div>
          )}
        </div>

        <button
          onClick={() => onTogglePlay(song)}
          disabled={!hasAudio}
          aria-label={isActive && isPlaying ? "Pause" : "Play"}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            hasAudio
              ? "bg-violet-600 hover:bg-violet-500 text-white"
              : "bg-surface-raised text-muted cursor-not-allowed"
          }`}
        >
          {isActive && isPlaying ? (
            <Icon icon={Pause} fill="currentColor" className="w-5 h-5" />
          ) : (
            <Icon icon={Play} fill="currentColor" className="w-5 h-5 ml-0.5" />
          )}
        </button>
      </div>

      <div className="flex items-center gap-2 px-3 pb-2">
        {isFailed && (
          <button
            onClick={() => onRetry(song)}
            disabled={isRetrying}
            className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 transition-colors disabled:opacity-50"
            title="Retry with same parameters"
            aria-label="Retry"
          >
            {isRetrying ? (
              <Spinner className="h-5 w-5" />
            ) : (
              <Icon icon={RefreshCw} className="w-5 h-5" />
            )}
          </button>
        )}

        <button
          onClick={() => onToggleFavorite(song)}
          aria-label={song.isFavorite ? "Remove from favorites" : "Add to favorites"}
          className={`flex-shrink-0 h-11 px-2 rounded-full flex items-center gap-1 transition-colors ${
            song.isFavorite
              ? "text-pink-500 hover:text-pink-400"
              : "text-muted hover:text-pink-400"
          }`}
        >
          {song.isFavorite ? (
            <Icon icon={Heart} fill="currentColor" className="w-5 h-5" />
          ) : (
            <Icon icon={Heart} className="w-5 h-5" />
          )}
          {((song as Song & { favoriteCount?: number }).favoriteCount ?? 0) > 0 && (
            <span className="text-xs font-medium">
              {(song as Song & { favoriteCount?: number }).favoriteCount}
            </span>
          )}
        </button>

        {hasAudio && (
          <ShareButton
            song={song}
            onUpdate={(updated) => {
              const next = { ...song, ...updated, isPublic: updated.isPublic ?? song.isPublic };
              setSong(next);
              onUpdate(next);
            }}
            source="library_card"
            className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              song.isPublic
                ? "bg-violet-100 dark:bg-violet-800 hover:bg-violet-200 dark:hover:bg-violet-700 text-violet-700 dark:text-violet-300"
                : "bg-surface-raised hover:bg-surface-hover text-primary"
            }`}
          />
        )}

        <button
          onClick={() => onDownload(song)}
          disabled={!hasAudio || isDownloading}
          aria-label={isDownloading ? `Downloading ${downloadProgress}%` : "Download song"}
          className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            hasAudio && !isDownloading
              ? "bg-surface-raised hover:bg-surface-hover text-primary"
              : "bg-surface-raised text-muted cursor-not-allowed"
          }`}
        >
          <Icon icon={Download} className="w-5 h-5" aria-hidden="true" />
        </button>

        {hasAudio && (
          <button
            onClick={() => isCached ? onRemoveOffline(song.id) : onSaveOffline(song)}
            disabled={isSaving}
            aria-label={isCached ? "Remove from offline cache" : isSaving ? "Saving for offline…" : "Save for offline playback"}
            className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              isCached
                ? "bg-emerald-100 dark:bg-emerald-900/40 hover:bg-red-100 dark:hover:bg-red-900/40 text-emerald-600 dark:text-emerald-400 hover:text-red-500 dark:hover:text-red-400"
                : isSaving
                  ? "bg-surface-raised text-muted cursor-not-allowed"
                  : "bg-surface-raised hover:bg-surface-hover text-primary"
            }`}
          >
            {isSaving ? (
              <Spinner className="h-5 w-5" />
            ) : isCached ? (
              <Icon icon={Check} className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Icon icon={CloudDownload} className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        )}

        <AddToPlaylistButton songId={song.id} />

        <SongRowMenu
          song={song}
          isArchiveView={isArchiveView}
          hasAudio={hasAudio}
          onToggleFavorite={onToggleFavorite}
          onSongUpdate={(updated) => {
            const next = { ...song, ...updated, isPublic: updated.isPublic ?? song.isPublic };
            setSong(next);
            onUpdate(next);
          }}
          onDownload={onDownload}
          onSingleArchive={onSingleArchive}
          onSingleRestore={onSingleRestore}
          onSingleDeleteForever={onSingleDeleteForever}
        />
      </div>

      {isActive && (
        <div className="px-3 pb-3">
          <PlayerBar
            currentTime={currentTime}
            duration={audioDuration}
            hasAudio={hasAudio}
            onSeek={onSeek}
          />
        </div>
      )}

      {isDownloading && downloadProgress !== null && downloadProgress < 100 && (
        <div className="px-3 pb-2">
          <div className="h-1 bg-surface-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        </div>
      )}

      {downloadError && (
        <div className="px-3 pb-2">
          <p className="text-xs text-red-400">{downloadError}</p>
        </div>
      )}
    </div>
  );
});

// Re-export the props type alias that LibraryView uses internally as SongRowProps
export type SongRowProps = SongListItemProps;
