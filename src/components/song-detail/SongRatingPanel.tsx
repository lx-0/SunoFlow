"use client";

import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { type SongRating } from "@/lib/ratings";
import { fetchEffect } from "@/lib/fetch-effect";
import { useToast } from "../Toast";
import { apiPost, apiPatch } from "@/lib/api-client";
import { StarPicker } from "../StarPicker";
import FormTextarea from "../ui/FormTextarea";

type ThumbsRating = "thumbs_up" | "thumbs_down" | null;

interface SongRatingPanelProps {
  songId: string;
  initialRating: number | null;
  initialRatingNote: string | null;
}

export function SongRatingPanel({ songId, initialRating, initialRatingNote }: SongRatingPanelProps) {
  const { toast } = useToast();

  const [rating, setRatingState] = useState<SongRating>({
    stars: initialRating ?? 0,
    note: initialRatingNote ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [noteDraft, setNoteDraft] = useState(initialRatingNote ?? "");

  const [thumbsRating, setThumbsRating] = useState<ThumbsRating>(null);
  const [savingThumbs, setSavingThumbs] = useState(false);

  useEffect(
    () =>
      fetchEffect<{ rating: ThumbsRating }>(
        `/api/songs/${songId}/feedback`,
        (data) => setThumbsRating(data.rating),
      ),
    [songId],
  );

  async function handleThumbsFeedback(value: "thumbs_up" | "thumbs_down") {
    if (savingThumbs) return;
    setSavingThumbs(true);
    try {
      await apiPost(`/api/songs/${songId}/feedback`, { rating: value });
      setThumbsRating(value);
    } catch {
      toast("Failed to save feedback", "error");
    } finally {
      setSavingThumbs(false);
    }
  }

  async function handleSaveRating() {
    if (rating.stars === 0 || savingRating) return;
    const r: SongRating = { stars: rating.stars, note: noteDraft.trim() };
    setSavingRating(true);
    try {
      await apiPatch(`/api/songs/${songId}/rating`, { stars: r.stars, note: r.note });
      setRatingState(r);
      setSaved(true);
    } catch {
      toast("Failed to save rating", "error");
    } finally {
      setSavingRating(false);
    }
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-xl p-4 space-y-3 transition-shadow duration-200 hover:shadow-md">
        <h2 className="text-sm font-semibold text-primary tracking-wide">Generation Quality</h2>
        <p className="text-xs text-secondary">Was this generation good?</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleThumbsFeedback("thumbs_up")}
            disabled={savingThumbs}
            aria-label="Thumbs up — good generation"
            aria-pressed={thumbsRating === "thumbs_up"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              thumbsRating === "thumbs_up"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700"
                : "bg-surface-raised text-secondary border border-border hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 hover:border-green-200"
            }`}
          >
            {thumbsRating === "thumbs_up" ? (
              <Icon icon={ThumbsUp} fill="currentColor" className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Icon icon={ThumbsUp} className="h-5 w-5" aria-hidden="true" />
            )}
            Good
          </button>
          <button
            type="button"
            onClick={() => handleThumbsFeedback("thumbs_down")}
            disabled={savingThumbs}
            aria-label="Thumbs down — poor generation"
            aria-pressed={thumbsRating === "thumbs_down"}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              thumbsRating === "thumbs_down"
                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700"
                : "bg-surface-raised text-secondary border border-border hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200"
            }`}
          >
            {thumbsRating === "thumbs_down" ? (
              <Icon icon={ThumbsDown} fill="currentColor" className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Icon icon={ThumbsDown} className="h-5 w-5" aria-hidden="true" />
            )}
            Poor
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-4 space-y-3 transition-shadow duration-200 hover:shadow-md">
        <h2 className="text-sm font-semibold text-primary tracking-wide">Your Rating</h2>

        <StarPicker value={rating.stars} onChange={(stars) => { setRatingState((r) => ({ ...r, stars })); setSaved(false); }} />

        <FormTextarea
          value={noteDraft}
          onChange={(e) => {
            setNoteDraft(e.target.value);
            setSaved(false);
          }}
          placeholder="Add a note (optional)..."
          aria-label="Rating note"
          rows={3}
          className="text-base"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveRating}
            disabled={rating.stars === 0}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:bg-surface-raised disabled:text-muted text-white text-sm font-medium rounded-lg transition-colors min-h-[44px]"
          >
            Save rating
          </button>
          {saved && (
            <span className="text-sm text-green-400">Saved</span>
          )}
        </div>
      </div>
    </>
  );
}
