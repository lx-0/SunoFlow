"use client";

import { BottomSheet } from "@/components/BottomSheet";

interface PublishSheetsProps {
  publish: {
    showPublishConfirm: boolean;
    setShowPublishConfirm: (v: boolean) => void;
    showUnpublishConfirm: boolean;
    setShowUnpublishConfirm: (v: boolean) => void;
    isPublishing: boolean;
    selectedGenre: string;
    setSelectedGenre: (v: string) => void;
    genres: { name: string; count: number }[];
    handlePublish: () => void;
    handleUnpublish: () => void;
  };
  isPublic: boolean;
  songCount: number;
}

export function PublishSheets({ publish, isPublic, songCount }: PublishSheetsProps) {
  return (
    <>
      <BottomSheet
        open={publish.showPublishConfirm}
        onClose={() => publish.setShowPublishConfirm(false)}
        title="Publish to Discover"
      >
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            This will make your playlist visible on the Discover page{!isPublic ? " and set it to public" : ""}.
          </p>
          {songCount === 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Your playlist needs at least 1 song before it can be published.
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="publish-genre" className="text-xs font-medium text-secondary">
              Genre (optional)
            </label>
            <select
              id="publish-genre"
              value={publish.selectedGenre}
              onChange={(e) => publish.setSelectedGenre(e.target.value)}
              className="w-full bg-surface-raised border border-border rounded-lg px-3 py-2.5 text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">No genre</option>
              {publish.genres.map((g) => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={publish.handlePublish}
              disabled={publish.isPublishing || songCount === 0}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {publish.isPublishing ? "Publishing…" : "Publish"}
            </button>
            <button
              onClick={() => publish.setShowPublishConfirm(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-raised text-primary transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      <BottomSheet
        open={publish.showUnpublishConfirm}
        onClose={() => publish.setShowUnpublishConfirm(false)}
        title="Unpublish playlist"
      >
        <div className="space-y-3">
          <p className="text-sm text-secondary">
            This will remove your playlist from the Discover page. The public share link will still work.
          </p>
          <div className="flex gap-2">
            <button
              onClick={publish.handleUnpublish}
              disabled={publish.isPublishing}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {publish.isPublishing ? "Unpublishing…" : "Unpublish"}
            </button>
            <button
              onClick={() => publish.setShowUnpublishConfirm(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-raised text-primary transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
