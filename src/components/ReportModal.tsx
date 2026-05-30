"use client";

import { useState, useRef } from "react";
import { FormTextarea } from "./ui/FormTextarea";
import { useToast } from "./Toast";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { ModalShell } from "./ModalShell";

const REASONS = [
  { value: "offensive", label: "Offensive content" },
  { value: "copyright", label: "Copyright violation" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

interface ReportModalProps {
  songId?: string;
  playlistId?: string;
  songTitle: string;
  onClose: () => void;
}

export function ReportModal({ songId, playlistId, songTitle, onClose }: ReportModalProps) {
  const entityType = playlistId ? "playlist" : "song";
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(dialogRef, true, onClose);

  const [doSubmit, submitting] = useAsyncAction(async () => {
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, playlistId, reason, description: description.trim() || undefined }),
      });

      if (res.status === 429) {
        toast("Too many reports. Please try again later.", "error");
        return;
      }

      if (res.status === 409) {
        toast(`You have already reported this ${entityType}.`, "error");
        onClose();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        toast(data.error || "Failed to submit report", "error");
        return;
      }

      toast("Report submitted. Thank you for helping keep SunoFlow safe.", "success");
      onClose();
    } catch {
      toast("Failed to submit report", "error");
    }
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) return;
    doSubmit();
  }

  return (
    <ModalShell
      title={`Report ${entityType === "playlist" ? "Playlist" : "Song"}`}
      titleId="report-modal-title"
      onClose={onClose}
      closeOnBackdrop
      dialogRef={dialogRef}
    >
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Reporting &ldquo;{songTitle}&rdquo;
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset>
            <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason
            </legend>
            <div className="space-y-2">
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors min-h-[44px] ${
                    reason === r.value
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    className="accent-violet-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">{r.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="report-description" className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Details (optional)
            </label>
            <FormTextarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context..."
              rows={3}
              maxLength={1000}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 rounded-lg transition-colors min-h-[44px]"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </div>
        </form>
    </ModalShell>
  );
}
