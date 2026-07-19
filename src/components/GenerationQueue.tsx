"use client";

import {
  ListMusic,
  X,
  ChevronUp,
  ChevronDown,
  Music,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import type { QueueItem } from "@/hooks/useGenerationQueue";
import { Spinner } from "./Spinner";

function QueueItemStatus({ status }: { status: QueueItem["status"] }) {
  switch (status) {
    case "processing":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
          <Spinner className="h-3.5 w-3.5" />
          Generating
        </span>
      );
    case "done":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
          <Icon icon={CircleCheck} fill="currentColor" className="h-3.5 w-3.5" />
          Done
        </span>
      );
    case "failed":
      return (
        <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <Icon icon={CircleAlert} fill="currentColor" className="h-3.5 w-3.5" />
          Failed
        </span>
      );
    default:
      return (
        <span className="text-xs font-medium text-secondary">
          Queued
        </span>
      );
  }
}

export function GenerationQueue({
  items,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  items: QueueItem[];
  onRemove: (id: string) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
}) {
  if (items.length === 0) return null;

  const activeItems = items.filter(
    (i) => i.status === "pending" || i.status === "processing"
  );
  const processingIndex = activeItems.findIndex(
    (i) => i.status === "processing"
  );

  return (
    <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon icon={ListMusic} className="h-5 w-5 text-violet-500" />
        <h3 className="text-sm font-semibold text-primary">
          Generation Queue
        </h3>
        {processingIndex >= 0 && (
          <span className="text-xs text-secondary">
            Processing {processingIndex + 1} of {activeItems.length}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {activeItems.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-lg p-2.5 border ${
              item.status === "processing"
                ? "border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-900/20"
                : "border-border bg-gray-50 dark:bg-gray-900/30"
            }`}
          >
            <div className="flex-shrink-0 h-8 w-8 rounded-md bg-surface-raised flex items-center justify-center">
              <Icon icon={Music} className="h-4 w-4 text-secondary" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary truncate">
                {item.title || "Untitled"}
              </p>
              <div className="flex items-center gap-2">
                <QueueItemStatus status={item.status} />
                {item.tags && (
                  <span className="text-[10px] text-muted truncate max-w-[120px]">
                    {item.tags}
                  </span>
                )}
              </div>
            </div>

            {/* Reorder buttons — only for pending items */}
            {item.status === "pending" && (
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => onMoveUp(index)}
                  disabled={index === 0 || activeItems[0]?.status === "processing" && index === 1}
                  className="p-0.5 text-secondary hover:text-primary disabled:opacity-30"
                  aria-label="Move up"
                >
                  <Icon icon={ChevronUp} className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveDown(index)}
                  disabled={index === activeItems.length - 1}
                  className="p-0.5 text-secondary hover:text-primary disabled:opacity-30"
                  aria-label="Move down"
                >
                  <Icon icon={ChevronDown} className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Cancel button */}
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="p-1 text-secondary hover:text-red-500 dark:hover:text-red-400 transition-colors"
              aria-label="Remove from queue"
            >
              <Icon icon={X} className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
