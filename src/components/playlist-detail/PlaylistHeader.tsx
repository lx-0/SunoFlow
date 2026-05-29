"use client";

import {
  PencilIcon,
  ShareIcon,
  TrashIcon,
  GlobeAltIcon,
  UserGroupIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import { formatDuration as formatTime } from "@/lib/time-format";

interface PlaylistHeaderProps {
  playlist: { name: string; description: string | null };
  editing: {
    editing: boolean;
    editName: string;
    setEditName: (v: string) => void;
    editDesc: string;
    setEditDesc: (v: string) => void;
    saving: boolean;
    handleSaveEdit: (e: React.FormEvent) => void;
    cancelEdit: () => void;
    startEdit: () => void;
    setShowDeleteConfirm: (v: boolean) => void;
  };
  share: {
    isPublic: boolean;
    showSharePanel: boolean;
    toggleSharePanel: (closeFn: () => void) => void;
    setShowSharePanel: (v: boolean) => void;
  };
  collab: {
    isCollaborative: boolean;
    showCollabPanel: boolean;
    toggleCollabPanel: () => void;
    closeCollabPanel: () => void;
  };
  publish: {
    isPublished: boolean;
    openPublish: () => void;
    openUnpublish: () => void;
  };
  batch: {
    handleSelectAll: () => void;
    selectedSongIds: ReadonlySet<string>;
  };
  songCount: number;
  totalDuration: number;
  isOwner: boolean;
}

export function PlaylistHeader({
  playlist,
  editing,
  share,
  collab,
  publish,
  batch,
  songCount,
  totalDuration,
  isOwner,
}: PlaylistHeaderProps) {
  if (editing.editing) {
    return (
      <form onSubmit={editing.handleSaveEdit} className="space-y-3">
        <input
          type="text"
          aria-label="Playlist name"
          value={editing.editName}
          onChange={(e) => editing.setEditName(e.target.value)}
          maxLength={100}
          autoFocus
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <input
          type="text"
          aria-label="Playlist description"
          value={editing.editDesc}
          onChange={(e) => editing.setEditDesc(e.target.value)}
          placeholder="Description (optional)"
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!editing.editName.trim() || editing.saving}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {editing.saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={editing.cancelEdit}
            className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white transition-colors min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {playlist.name}
        </h1>
        {playlist.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {playlist.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {songCount} song{songCount !== 1 ? "s" : ""}
            {totalDuration > 0 && ` · ${formatTime(totalDuration)}`}
          </p>
          {publish.isPublished && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
              <GlobeAltIcon className="w-3 h-3" />
              Published
            </span>
          )}
        </div>
        {songCount > 0 && (
          <button
            onClick={batch.handleSelectAll}
            className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
          >
            {batch.selectedSongIds.size === songCount ? "Deselect all" : "Select all"}
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        {isOwner && (
          <button
            onClick={() => {
              if (publish.isPublished) {
                publish.openUnpublish();
              } else {
                publish.openPublish();
              }
            }}
            aria-label={publish.isPublished ? "Unpublish from Discover" : "Publish to Discover"}
            title={publish.isPublished ? "Unpublish from Discover" : "Publish to Discover"}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              publish.isPublished
                ? "text-green-500 dark:text-green-400 hover:text-green-600"
                : "text-gray-400 dark:text-gray-500 hover:text-violet-400"
            }`}
          >
            <MegaphoneIcon className="w-5 h-5" />
          </button>
        )}
        {isOwner && (
          <button
            onClick={() => { collab.toggleCollabPanel(); share.setShowSharePanel(false); }}
            aria-label="Collaborative mode"
            aria-expanded={collab.showCollabPanel}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
              collab.isCollaborative
                ? "text-violet-500 dark:text-violet-400 hover:text-violet-600"
                : "text-gray-400 dark:text-gray-500 hover:text-violet-400"
            }`}
          >
            <UserGroupIcon className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => share.toggleSharePanel(collab.closeCollabPanel)}
          aria-label="Share playlist"
          aria-expanded={share.showSharePanel}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
            share.isPublic
              ? "text-violet-500 dark:text-violet-400 hover:text-violet-600"
              : "text-gray-400 dark:text-gray-500 hover:text-violet-400"
          }`}
        >
          <ShareIcon className="w-5 h-5" />
        </button>
        {isOwner && (
          <>
            <button
              onClick={editing.startEdit}
              aria-label="Edit playlist"
              className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => editing.setShowDeleteConfirm(true)}
              aria-label="Delete playlist"
              className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
