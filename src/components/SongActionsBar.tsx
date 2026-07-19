"use client";

import {
  Share2,
  Flag,
  FastForward,
  Code,
  ListMusic,
  CloudDownload,
  CircleCheck,
  Archive,
  ArchiveX,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { DownloadButton } from "./DownloadButton";
import type { SunoSong } from "@/lib/sunoapi";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SongActionsBarProps {
  song: SunoSong;
  hasAudio: boolean;
  isPublic: boolean;
  publicSlug: string | null;
  isCached: boolean;
  isSavingOffline: boolean;
  sharing: boolean;
  coverImageUrl: string | null;
  onVisibilityToggle: () => void;
  onCopyLink: () => void;
  onShareOnX: () => void;
  onEmbedOpen: () => void;
  onReportOpen: () => void;
  onSaveOffline: () => void;
  onRemoveOffline: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  isArchived: boolean;
  archiving: boolean;
  onArchive: () => void;
  onRestore: () => void;
}

// ─── SongActionsBar ──────────────────────────────────────────────────────────

export function SongActionsBar({
  song,
  hasAudio,
  isPublic,
  isCached,
  isSavingOffline,
  sharing,
  onVisibilityToggle,
  onCopyLink,
  onShareOnX,
  onEmbedOpen,
  onReportOpen,
  onSaveOffline,
  onRemoveOffline,
  onPlayNext,
  onAddToQueue,
  isArchived,
  archiving,
  onArchive,
  onRestore,
}: SongActionsBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Primary actions */}
      {hasAudio && (
        <DownloadButton song={song} />
      )}
      {hasAudio && (
        <button
          onClick={isCached ? onRemoveOffline : onSaveOffline}
          disabled={isSavingOffline}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 active:scale-95 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed ${
            isCached
              ? "bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400"
              : "bg-surface-raised hover:bg-surface-hover text-primary"
          }`}
        >
          {isCached ? (
            <Icon icon={CircleCheck} className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          ) : (
            <Icon icon={CloudDownload} className={`w-4 h-4 flex-shrink-0 ${isSavingOffline ? "animate-pulse" : ""}`} aria-hidden="true" />
          )}
          {isSavingOffline ? "Saving…" : isCached ? "Saved Offline" : "Save Offline"}
        </button>
      )}

      {/* Divider dot */}
      <span className="w-1 h-1 rounded-full bg-border-strong hidden sm:block" aria-hidden="true" />

      {/* Secondary actions */}
      {/* Visibility toggle */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-raised min-h-[44px]">
        <Icon icon={Share2} fill="currentColor" className="w-4 h-4 flex-shrink-0 text-secondary" aria-hidden="true" />
        <span className="text-sm font-medium text-primary">
          {isPublic ? "Public" : "Private"}
        </span>
        <button
          role="switch"
          aria-checked={isPublic}
          aria-label={isPublic ? "Make song private" : "Make song public"}
          disabled={sharing}
          onClick={onVisibilityToggle}
          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-50 ${
            isPublic ? "bg-violet-600" : "bg-border-strong"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
              isPublic ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>
      {isPublic && (
        <button
          onClick={onCopyLink}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-raised hover:bg-surface-hover text-primary transition-all duration-200 active:scale-95 min-h-[44px]"
        >
          <Icon icon={Share2} fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          Share
        </button>
      )}
      {isPublic && (
        <button
          onClick={onShareOnX}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-raised hover:bg-surface-hover text-primary transition-all duration-200 active:scale-95 min-h-[44px]"
          aria-label="Share on X (Twitter)"
        >
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </button>
      )}

      {/* Embed code button — only for public songs */}
      {isPublic && (
        <button
          onClick={onEmbedOpen}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-raised hover:bg-surface-hover text-primary transition-all duration-200 active:scale-95 min-h-[44px]"
        >
          <Icon icon={Code} fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          Get Embed Code
        </button>
      )}

      {/* Queue actions */}
      {song.audioUrl && (
        <>
          <button
            onClick={onPlayNext}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-raised hover:bg-surface-hover text-primary transition-all duration-200 active:scale-95 min-h-[44px]"
          >
            <Icon icon={FastForward} fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            Play Next
          </button>
          <button
            onClick={onAddToQueue}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-raised hover:bg-surface-hover text-primary transition-all duration-200 active:scale-95 min-h-[44px]"
          >
            <Icon icon={ListMusic} className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            Add to Queue
          </button>
        </>
      )}

      {/* Archive / Restore button */}
      {isArchived ? (
        <button
          onClick={onRestore}
          disabled={archiving}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-emerald-100 dark:bg-emerald-900/30 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 transition-all duration-200 active:scale-95 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Restore song from archive"
        >
          <Icon icon={ArchiveX} className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {archiving ? "Restoring…" : "Restore"}
        </button>
      ) : (
        <button
          onClick={onArchive}
          disabled={archiving}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-raised hover:bg-red-100 dark:hover:bg-red-900/30 text-secondary hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 active:scale-95 min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Archive song"
        >
          <Icon icon={Archive} className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {archiving ? "Archiving…" : "Archive"}
        </button>
      )}

      {/* Report button */}
      <button
        onClick={onReportOpen}
        className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-surface-raised hover:bg-red-100 dark:hover:bg-red-900/30 text-secondary hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 active:scale-95 min-h-[44px]"
        aria-label="Report song"
      >
        <Icon icon={Flag} fill="currentColor" className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
        Report
      </button>
    </div>
  );
}
