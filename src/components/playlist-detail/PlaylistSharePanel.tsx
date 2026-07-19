"use client";

import { ClipboardCopy, Globe, Lock } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

interface PlaylistSharePanelProps {
  isPublic: boolean;
  slug: string | null;
  isTogglingShare: boolean;
  onToggleShare: () => void;
  onCopyLink: () => void;
  onCopyEmbed: () => void;
}

export function PlaylistSharePanel({
  isPublic,
  slug,
  isTogglingShare,
  onToggleShare,
  onCopyLink,
  onCopyEmbed,
}: PlaylistSharePanelProps) {
  return (
    <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPublic ? (
            <Icon icon={Globe} className="w-4 h-4 text-violet-500" />
          ) : (
            <Icon icon={Lock} className="w-4 h-4 text-muted" />
          )}
          <span className="text-sm font-medium text-primary">
            {isPublic ? "Public playlist" : "Private playlist"}
          </span>
        </div>
        <button
          onClick={onToggleShare}
          disabled={isTogglingShare}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-surface-raised disabled:opacity-50 ${
            isPublic ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
          }`}
          role="switch"
          aria-checked={isPublic}
          aria-label="Toggle playlist visibility"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isPublic ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {isPublic && slug && (
        <>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-secondary">Share link</p>
            <div className="flex gap-2">
              <input
                readOnly
                aria-label="Share link"
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${slug}`}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={onCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
              >
                <Icon icon={ClipboardCopy} className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-secondary">Embed code</p>
            <div className="flex gap-2">
              <input
                readOnly
                aria-label="Embed code"
                value={`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/playlist/${slug}" width="400" height="500" frameborder="0" allow="autoplay"></iframe>`}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-xs text-secondary focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
              <button
                onClick={onCopyEmbed}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
              >
                <Icon icon={ClipboardCopy} className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
