"use client";

import {
  GlobeAltIcon,
  LockClosedIcon,
  ClipboardDocumentIcon,
} from "@heroicons/react/24/outline";

interface SharePanelProps {
  share: {
    isPublic: boolean;
    slug: string | null;
    showSharePanel: boolean;
    isTogglingShare: boolean;
    handleToggleShare: () => void;
    handleCopyLink: () => void;
    handleCopyEmbed: () => void;
  };
  isEditing: boolean;
}

export function SharePanel({ share, isEditing }: SharePanelProps) {
  if (!share.showSharePanel || isEditing) return null;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {share.isPublic ? (
            <GlobeAltIcon className="w-4 h-4 text-violet-500" />
          ) : (
            <LockClosedIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          )}
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {share.isPublic ? "Public playlist" : "Private playlist"}
          </span>
        </div>
        <button
          onClick={share.handleToggleShare}
          disabled={share.isTogglingShare}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 ${
            share.isPublic ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
          }`}
          role="switch"
          aria-checked={share.isPublic}
          aria-label="Toggle playlist visibility"
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              share.isPublic ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {share.isPublic && share.slug && (
        <>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Share link</p>
            <div className="flex gap-2">
              <input
                readOnly
                aria-label="Share link"
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${share.slug}`}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={share.handleCopyLink}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Embed code</p>
            <div className="flex gap-2">
              <input
                readOnly
                aria-label="Embed code"
                value={`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/playlist/${share.slug}" width="400" height="500" frameborder="0" allow="autoplay"></iframe>`}
                className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
              />
              <button
                onClick={share.handleCopyEmbed}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                Copy
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
