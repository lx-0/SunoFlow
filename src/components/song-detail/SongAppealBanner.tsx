"use client";

import { useRef, useState } from "react";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { useToast } from "../Toast";
import { apiPost } from "@/lib/api-client";
import { HttpError } from "@/components/QueryProvider";

interface SongAppealBannerProps {
  songId: string;
  isHidden: boolean;
}

export function SongAppealBanner({ songId, isHidden }: SongAppealBannerProps) {
  const { toast } = useToast();
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealStatus, setAppealStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const appealDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(appealDialogRef, appealOpen, () => setAppealOpen(false));

  if (!isHidden) return null;

  const handleSubmitAppeal = async () => {
    if (appealReason.trim().length < 10) return;
    setAppealSubmitting(true);
    try {
      await apiPost("/api/appeals", { songId, reason: appealReason.trim() });
      setAppealStatus("pending");
      setAppealOpen(false);
      toast("Appeal submitted. We'll review it shortly.");
    } catch (e) {
      if (e instanceof HttpError && e.status === 409) {
        setAppealStatus("pending");
        setAppealOpen(false);
        toast("You already have a pending appeal for this song.");
      } else {
        toast("Failed to submit appeal. Please try again.");
      }
    } finally {
      setAppealSubmitting(false);
    }
  };

  return (
    <>
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
        <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">This song was removed by a moderator.</p>
        {appealStatus === "pending" ? (
          <p className="text-xs text-red-600 dark:text-red-400">Your appeal is under review.</p>
        ) : appealStatus === "approved" ? (
          <p className="text-xs text-green-600 dark:text-green-400">Your appeal was approved.</p>
        ) : appealStatus === "rejected" ? (
          <p className="text-xs text-red-600 dark:text-red-400">Your appeal was rejected.</p>
        ) : (
          <button
            onClick={() => setAppealOpen(true)}
            className="mt-1 text-xs font-medium text-red-700 dark:text-red-300 underline hover:no-underline"
          >
            Appeal this decision
          </button>
        )}
      </div>

      {appealOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4" onClick={() => setAppealOpen(false)}>
          <div
            ref={appealDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="appeal-modal-title"
            tabIndex={-1}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="appeal-modal-title" className="text-lg font-bold mb-2 text-gray-900 dark:text-white">Appeal removal</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Explain why you believe this song should be restored. Be specific — our team will review your appeal.
            </p>
            <textarea
              className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              rows={5}
              placeholder="Describe why this content should be restored (min 10 characters)…"
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
              maxLength={2000}
            />
            <p className="text-xs text-gray-400 text-right mt-1">{appealReason.length}/2000</p>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setAppealOpen(false)}
                className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAppeal}
                disabled={appealSubmitting || appealReason.trim().length < 10}
                className="flex-1 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {appealSubmitting ? "Submitting…" : "Submit appeal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
